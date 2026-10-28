import Link from "@docusaurus/Link";
import { maxUsableItemLevel } from "@site/src/utils/itemLevelLimits";
import { useCallback, useEffect, useMemo, useState } from "react";
import BaseStatsEditor from "../CharacterPlanner/BaseStatsEditor";
import CharacterDoll from "../CharacterPlanner/CharacterDoll";
import {
  PrefilledBanner,
  useActiveCharacterPrefill,
} from "../CharacterPlanner/ActiveCharacterPrefill";
import ImportProfile from "../CharacterPlanner/ImportProfile";
import PactSelector, { ActivePactsBar } from "../CharacterPlanner/PactSelector";
import StatsDisplay from "../CharacterPlanner/StatsDisplay";
import {
  encodeCharacterState,
  useCharacterState,
} from "../CharacterPlanner/useCharacterState";
import type { ItemRarity } from "../Item";
import styles from "./ItemSimulator.module.css";
import {
  getDefaultArmourEnchantValue,
  getDefaultWeaponEnchantValue,
  runSimulation,
  SimulationWeights,
  StatToggles,
} from "./simulationEngine";

const DEFAULT_WEIGHTS: SimulationWeights = {
  critDamage: 25,
  block: 25,
  damage: 25,
  armor: 25,
};

const WEIGHT_CONFIG: {
  key: keyof SimulationWeights;
  label: string;
  desc: string;
}[] = [
  {
    key: "critDamage",
    label: "Critical Damage",
    desc: "Maximises critical hit chance via critical attack value and Dexterity",
  },
  {
    key: "block",
    label: "Block",
    desc: "Maximises block chance via block value and Strength",
  },
  {
    key: "damage",
    label: "Damage",
    desc: "Maximises total damage output including weapon and flat damage",
  },
  {
    key: "armor",
    label: "Armour",
    desc: "Maximises armour, resilience, and health",
  },
];

const RARITY_OPTIONS: { value: ItemRarity; label: string }[] = [
  { value: "green", label: "Green (Ceres)" },
  { value: "blue", label: "Blue (Neptune)" },
  { value: "purple", label: "Purple (Mars)" },
  { value: "orange", label: "Orange (Jupiter)" },
  { value: "red", label: "Red (Olympus)  — recommended" },
];

export default function ItemSimulator() {
  const {
    equippedItems,
    characterLevel,
    baseStats,
    characterIdentity,
    setCharacterLevel,
    setBaseStats,
    characterStats,
    importProfile,
    activePacts,
    togglePact,
    removeItem,
    clearAll,
    resetCharacter,
  } = useCharacterState();

  // Attributes only: the simulation finds the items
  const { prefilledFrom, startFresh } = useActiveCharacterPrefill(
    { equippedItems, baseStats, characterLevel, activePacts, importProfile, resetCharacter },
    { withItems: false },
  );

  const [weights, setWeights] = useState<SimulationWeights>(DEFAULT_WEIGHTS);
  const [statToggles, setStatToggles] = useState<StatToggles>({
    dexterity: true,
    agility: true,
    strength: true,
    intelligence: true,
  });
  const [evaluationRarity, setEvaluationRarity] = useState<ItemRarity>("red");
  const [isSimulating, setIsSimulating] = useState(false);
  const [notification, setNotification] = useState("");

  const usableItemLevel = maxUsableItemLevel(characterLevel);

  const [weaponEnchant, setWeaponEnchant] = useState(() =>
    getDefaultWeaponEnchantValue(characterLevel, evaluationRarity),
  );
  const [armourEnchant, setArmourEnchant] = useState(() =>
    getDefaultArmourEnchantValue(characterLevel, evaluationRarity),
  );

  useEffect(() => {
    setWeaponEnchant(
      getDefaultWeaponEnchantValue(characterLevel, evaluationRarity),
    );
    setArmourEnchant(
      getDefaultArmourEnchantValue(characterLevel, evaluationRarity),
    );
  }, [characterLevel, evaluationRarity]);

  useEffect(() => {
    setBaseStats({
      strength: characterLevel * 5,
      dexterity: characterLevel * 5,
      agility: characterLevel * 5,
      constitution: characterLevel * 5,
      charisma: characterLevel * 5,
      intelligence: characterLevel * 5,
    });
  }, [characterLevel]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 4000);
  };

  const handleWeightChange = (key: keyof SimulationWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  const totalWeight =
    weights.critDamage + weights.block + weights.damage + weights.armor;

  const handleSimulate = useCallback(() => {
    setIsSimulating(true);
    // Yield to React so the loading state renders before the synchronous computation
    setTimeout(() => {
      try {
        const result = runSimulation(
          characterLevel,
          baseStats,
          activePacts,
          weights,
          statToggles,
          evaluationRarity,
          weaponEnchant,
          armourEnchant,
        );
        importProfile(
          characterLevel,
          baseStats,
          result.build,
          characterIdentity,
          activePacts,
        );
        showNotification(
          `Simulation complete — ${result.build.size} items found`,
        );
      } catch (err) {
        showNotification("Simulation failed. Please try again.");
        console.error("Simulation error:", err);
      } finally {
        setIsSimulating(false);
      }
    }, 16);
  }, [
    characterLevel,
    baseStats,
    activePacts,
    weights,
    statToggles,
    evaluationRarity,
    weaponEnchant,
    armourEnchant,
    characterIdentity,
    importProfile,
  ]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(globalThis.window.location.href);
      showNotification("Build URL copied to clipboard!");
    } catch {
      prompt(
        "Copy this URL to share your build:",
        globalThis.window.location.href,
      );
    }
  };

  const minConsideredItemLevel = Math.max(1, characterLevel - 30);

  const hasResults = equippedItems.size > 0;

  const characterPlannerUrl = useMemo(() => {
    const encoded = encodeCharacterState(
      characterLevel,
      baseStats,
      characterIdentity,
      equippedItems,
      activePacts,
    );
    return `/character-planner?s=${encoded}`;
  }, [
    characterLevel,
    baseStats,
    characterIdentity,
    equippedItems,
    activePacts,
  ]);

  return (
    <div className={styles.itemSimulator}>
      <div className={styles.header}>
        <h1 className={styles.title}>Optimal Build Simulation</h1>
        <p className={styles.subtitle}>
          Find the optimal item combination for your character based on your
          stat priorities.
        </p>
      </div>

      {prefilledFrom && <PrefilledBanner name={prefilledFrom} onClear={startFresh} />}

      {/* Profile import */}
      <div className={styles.importSection}>
        <ImportProfile
          onImport={(level, stats, _items, identity, pacts) => {
            // Import character attributes but discard profile items — simulation will find new ones
            importProfile(level, stats, new Map(), identity, pacts);
          }}
        />
      </div>

      {/* Character setup */}
      <div className={styles.setupSection}>
        <div className={styles.setupCard}>
          <h3 className={styles.cardTitle}>Character</h3>
          <div className={styles.levelRow}>
            <label htmlFor="sim-level" className={styles.levelLabel}>
              Level:
            </label>
            <input
              id="sim-level"
              type="number"
              min="1"
              max="1000"
              value={characterLevel}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                if (v >= 1 && v <= 1000) setCharacterLevel(v);
              }}
              className={styles.levelInput}
            />
            <span className={styles.levelHint}>
              Searching items level <strong>{minConsideredItemLevel}</strong>–
              <strong>{usableItemLevel}</strong>
            </span>
          </div>

          <BaseStatsEditor
            baseStats={baseStats}
            setBaseStats={setBaseStats}
            characterStats={characterStats}
            characterLevel={characterLevel}
            activePacts={activePacts}
          />
        </div>

        <div className={styles.setupCard}>
          <h3 className={styles.cardTitle}>Pacts</h3>
          <PactSelector
            activePacts={activePacts}
            togglePact={togglePact}
            characterLevel={characterLevel}
            baseStats={baseStats}
            baseHealthFromConstitution={
              characterStats.baseHealthFromConstitution
            }
          />
        </div>
      </div>

      {/* Priority weights */}
      <div className={styles.weightsSection}>
        <h3 className={styles.sectionTitle}>Stat Priorities</h3>
        <p className={styles.sectionDesc}>
          Set the importance (0–100) of each combat objective. The simulation
          weighs items relative to these values. Agility, Dexterity,
          Constitution, and Strength from items are already factored through the
          combat stats above.
        </p>

        {WEIGHT_CONFIG.map(({ key, label, desc }) => {
          const pct =
            totalWeight > 0
              ? Math.round((weights[key] / totalWeight) * 100)
              : 0;
          return (
            <div key={key} className={styles.weightRow}>
              <div className={styles.weightMeta}>
                <span className={styles.weightLabel}>{label}</span>
                <span className={styles.weightDesc}>{desc}</span>
              </div>
              <div className={styles.weightSliderGroup}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights[key]}
                  onChange={(e) =>
                    handleWeightChange(key, Number.parseInt(e.target.value, 10))
                  }
                  className={styles.weightSlider}
                />
                <span className={styles.weightValue}>{weights[key]}</span>
                <span className={styles.weightPct}>{pct}%</span>
              </div>
              <div className={styles.weightBar}>
                <div
                  className={styles.weightBarFill}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        {/* Stat-efficiency toggles */}
        <div className={styles.statToggleRow}>
          {(
            [
              { key: "dexterity", label: "Dexterity ×1.0" },
              { key: "agility", label: "Agility ×0.8" },
              { key: "strength", label: "Strength ×0.5" },
              { key: "intelligence", label: "Intelligence ×0.5" },
            ] as { key: keyof StatToggles; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className={styles.statToggle}>
              <input
                type="checkbox"
                checked={statToggles[key]}
                onChange={(e) =>
                  setStatToggles((prev) => ({
                    ...prev,
                    [key]: e.target.checked,
                  }))
                }
                className={styles.statToggleCheckbox}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Evaluation rarity */}
      <div className={styles.optionsSection}>
        <label className={styles.rarityLabel}>
          Evaluate items at rarity:
          <select
            value={evaluationRarity}
            onChange={(e) => setEvaluationRarity(e.target.value as ItemRarity)}
            className={styles.raritySelect}
          >
            {RARITY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.rarityHint}>
          Higher rarity multiplies item stats but is rarer to obtain. Orange is
          a practical target for most players. All candidates are evaluated as{" "}
          <strong>conditioned</strong> (one tier above the selected rarity in
          stat strength — e.g. red shows red+ values), so the results represent
          the theoretical ceiling at that rarity.
        </p>

        <div className={styles.enchantRow}>
          <label className={styles.enchantLabel}>
            Weapon damage enchant:
            <input
              type="number"
              min="0"
              max="9999"
              value={weaponEnchant}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(v) && v >= 0) setWeaponEnchant(v);
              }}
              className={styles.enchantInput}
            />
            <span className={styles.rarityHint}>
              flat damage added to weapon
            </span>
          </label>
          <label className={styles.enchantLabel}>
            Armour enchant (per piece):
            <input
              type="number"
              min="0"
              max="99999"
              value={armourEnchant}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                if (!Number.isNaN(v) && v >= 0) setArmourEnchant(v);
              }}
              className={styles.enchantInput}
            />
            <span className={styles.rarityHint}>
              flat armour added to each armour piece
            </span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.simulateButton}
          onClick={handleSimulate}
          disabled={isSimulating}
        >
          {isSimulating ? "⚙ Simulating…" : "⚔ Find Optimal Build"}
        </button>

        {hasResults && (
          <>
            <button className={styles.shareButton} onClick={handleShare}>
              📋 Share Build
            </button>
            <Link className={styles.continueButton} to={characterPlannerUrl}>
              🛡 Continue in Character Planner
            </Link>
            <button className={styles.clearButton} onClick={clearAll}>
              Clear Results
            </button>
          </>
        )}
      </div>

      {/* Results */}
      {hasResults && (
        <div className={styles.results}>
          <h3 className={styles.sectionTitle}>Optimal Build</h3>

          <ActivePactsBar
            activePacts={activePacts}
            togglePact={togglePact}
            baseStats={baseStats}
            characterLevel={characterLevel}
            baseHealthFromConstitution={
              characterStats.baseHealthFromConstitution
            }
          />

          <div className={styles.buildDisplay}>
            <CharacterDoll
              equippedItems={equippedItems}
              onSlotClick={() => {}}
              onSlotRemove={removeItem}
              characterLevel={characterLevel}
              characterBaseStats={baseStats}
            />
          </div>

          <div className={styles.statsArea}>
            <StatsDisplay stats={characterStats} />
          </div>

          <div className={styles.itemList}>
            <h4 className={styles.itemListTitle}>Selected Items</h4>
            <div className={styles.itemListGrid}>
              {(
                [...equippedItems.entries()] as [
                  string,
                  import("../CharacterPlanner/useCharacterState").EquippedItem,
                ][]
              ).map(([slot, item]) => {
                const name = [
                  item.prefix?.name,
                  item.baseItem.name,
                  item.suffix?.name,
                ]
                  .filter(Boolean)
                  .join(" ");
                const itemLevel =
                  item.baseItem.level +
                  (item.prefix?.level ?? 0) +
                  (item.suffix?.level ?? 0);
                const rarityColors: Record<string, string> = {
                  common: "#ffffff",
                  green: "#00ff00",
                  blue: "#5159F7",
                  purple: "#E303E0",
                  orange: "#ff8000",
                  red: "#ff0000",
                };
                return (
                  <div key={slot} className={styles.itemRow}>
                    <span className={styles.itemSlot}>{slot}</span>
                    <span
                      className={styles.itemName}
                      style={{ color: rarityColors[item.rarity] ?? "#fff" }}
                    >
                      {name}
                      {item.conditioned ? "+" : ""}
                    </span>
                    <span className={styles.itemLevel}>Lv {itemLevel}</span>
                    {item.enchantValue !== undefined &&
                      item.enchantValue > 0 && (
                        <span className={styles.itemEnchant}>
                          {slot === "mainHand"
                            ? `+${item.enchantValue} dmg`
                            : `+${item.enchantValue} arm`}
                        </span>
                      )}
                    {item.upgrades && item.upgrades.length > 0 && (
                      <span className={styles.itemEnchant}>
                        +{item.upgrades[0].level}
                        {item.upgrades[0].upgrade.stat}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className={styles.notification}>✓ {notification}</div>
      )}
    </div>
  );
}
