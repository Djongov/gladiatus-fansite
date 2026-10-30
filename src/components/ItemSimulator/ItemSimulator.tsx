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
  calculateCharacterStats,
  encodeCharacterState,
  useCharacterState,
  type EquippedItem,
  type ItemSlotType,
} from "../CharacterPlanner/useCharacterState";
import type { ItemRarity } from "../Item";
import {
  fightStatsFromCharacterStats,
  withProfileStats,
} from "@site/src/services/combat/characterToCombatant";
import type { FightStats } from "@site/src/services/combat/expectedOutcome";
import { simulateOddsPvP } from "@site/src/services/combat/simulateOdds";
import type { Combatant } from "@site/src/services/combat/types";
import styles from "./ItemSimulator.module.css";
import {
  DEFAULT_SIMULATION_WEIGHTS,
  getDefaultArmourEnchantValue,
  getDefaultWeaponEnchantValue,
  runSimulation,
  SimulationWeights,
  PowderToggles,
} from "./simulationEngine";

// Fights used to verify a build's arena win chance with the real battle engine
const VERIFICATION_FIGHTS = 2000;

interface ArenaOpponent {
  name: string;
  level: number;
  fightStats: FightStats;
  /** True when the fight stats come from the game's profile totals (includes buffs). */
  usesProfileTotals: boolean;
}

interface ArenaVerdict {
  opponentName: string;
  optimisedWinChance: number;
  profileGearWinChance?: number;
}

/** Arena win chance (0..1) from simulateOddsPvP, counting draws as half a win. */
function verifiedWinChance(attacker: FightStats, opponent: FightStats): number {
  const asCombatant = (fight: FightStats, name: string): Combatant =>
    ({ ...fight, name, level: 0, hp: fight.maxHp, armour: 0, strength: 0, constitution: 0 });
  const odds = simulateOddsPvP(asCombatant(attacker, "attacker"), asCombatant(opponent, "defender"), VERIFICATION_FIGHTS);
  return (odds.wins + odds.draws / 2) / odds.ran;
}

const formatPercent = (chance: number) => `${(chance * 100).toFixed(1)}%`;

const WEIGHT_CONFIG: {
  key: keyof SimulationWeights;
  label: string;
  desc: string;
}[] = [
  {
    key: "critDamage",
    label: "Critical Damage",
    desc: "Critical hit chance (critical attack value and Dexterity)",
  },
  {
    key: "block",
    label: "Block",
    desc: "Block chance (block value and Strength)",
  },
  {
    key: "damage",
    label: "Damage",
    desc: "Average damage, hit chance (Dexterity) and double hits (Charisma)",
  },
  {
    key: "armor",
    label: "Armour",
    desc: "Armour, crit avoidance (resilience), dodge (Agility) and Intelligence",
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

  const [weights, setWeights] = useState<SimulationWeights>(DEFAULT_SIMULATION_WEIGHTS);
  const [powders, setPowders] = useState<PowderToggles>({
    dexterity: true,
    agility: true,
    strength: true,
    intelligence: true,
  });
  const [evaluationRarity, setEvaluationRarity] = useState<ItemRarity>("red");
  const [isSimulating, setIsSimulating] = useState(false);
  const [notification, setNotification] = useState("");
  const [opponent, setOpponent] = useState<ArenaOpponent | null>(null);
  // Gear from the imported own profile, kept only to compare it with the optimised build
  const [profileGear, setProfileGear] = useState<Map<ItemSlotType, EquippedItem> | null>(null);
  const [arenaVerdict, setArenaVerdict] = useState<ArenaVerdict | null>(null);
  // Overrides the wear limit, e.g. for Circus Turma (no wear limit): null means use the wear limit
  const [maxItemLevelOverride, setMaxItemLevelOverride] = useState<number | null>(null);

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

  // Only a manual level change resets base stats to fully trained (level × 5).
  // Doing this in an effect would overwrite stats from an imported profile or a shared URL.
  const handleLevelChange = (level: number) => {
    setCharacterLevel(level);
    const fullyTrained = level * 5;
    setBaseStats({
      strength: fullyTrained,
      dexterity: fullyTrained,
      agility: fullyTrained,
      constitution: fullyTrained,
      charisma: fullyTrained,
      intelligence: fullyTrained,
    });
  };

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
        const result = runSimulation({
          characterLevel,
          baseStats,
          activePacts,
          weights,
          powders,
          evaluationRarity,
          weaponEnchantValue: weaponEnchant,
          armourEnchantValue: armourEnchant,
          opponent: opponent?.fightStats,
          maxItemLevel: maxItemLevelOverride ?? undefined,
        });
        if (opponent) {
          const fightStatsFor = (items: Map<ItemSlotType, EquippedItem>) =>
            fightStatsFromCharacterStats(calculateCharacterStats(items, characterLevel, baseStats, activePacts));
          setArenaVerdict({
            opponentName: opponent.name,
            optimisedWinChance: verifiedWinChance(fightStatsFor(result.build), opponent.fightStats),
            profileGearWinChance: profileGear && profileGear.size > 0
              ? verifiedWinChance(fightStatsFor(profileGear), opponent.fightStats)
              : undefined,
          });
        } else {
          setArenaVerdict(null);
        }
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
    powders,
    evaluationRarity,
    weaponEnchant,
    armourEnchant,
    opponent,
    maxItemLevelOverride,
    profileGear,
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
          onImport={(level, stats, items, identity, pacts) => {
            // Import character attributes but not the gear — the simulation finds new gear.
            // The gear is kept aside so an arena run can compare it with the optimised build.
            importProfile(level, stats, new Map(), identity, pacts);
            setProfileGear(items);
            setArenaVerdict(null);
          }}
        />
      </div>

      {/* Optional arena opponent */}
      <div className={styles.setupCard}>
        <h3 className={styles.cardTitle}>Arena Opponent (optional)</h3>
        {opponent ? (
          <>
            <p className={styles.sectionDesc}>
              Optimising for arena win chance against{" "}
              <strong>{opponent.name}</strong> (level {opponent.level}):{" "}
              {opponent.fightStats.maxHp.toLocaleString()} life points, damage{" "}
              {opponent.fightStats.damageMin}–{opponent.fightStats.damageMax},
              crit {Math.round(opponent.fightStats.critChance)}%, block{" "}
              {Math.round(opponent.fightStats.blockChance)}%.
              {opponent.usesProfileTotals
                ? " Uses the totals shown on their profile, including buffs."
                : " Uses planner-calculated stats from their gear."}
            </p>
            <button
              className={styles.clearButton}
              onClick={() => {
                setOpponent(null);
                setArenaVerdict(null);
              }}
            >
              Remove opponent
            </button>
          </>
        ) : (
          <>
            <p className={styles.sectionDesc}>
              Import the profile of a player you want to beat. The simulation
              then optimises your arena win chance against them directly, and
              the stat priorities below are not used.
            </p>
            <ImportProfile
              onImport={(level, stats, items, identity, pacts, _url, details) => {
                const planned = fightStatsFromCharacterStats(
                  calculateCharacterStats(items, level, stats, pacts ?? new Set()),
                );
                setOpponent({
                  name: identity.name,
                  level,
                  fightStats: details ? withProfileStats(planned, details.stats) : planned,
                  usesProfileTotals: !!details,
                });
                setArenaVerdict(null);
              }}
            />
          </>
        )}
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
                if (v >= 1 && v <= 1000) handleLevelChange(v);
              }}
              className={styles.levelInput}
            />
            <span className={styles.levelHint}>
              Searching items up to level{" "}
              <strong>{maxItemLevelOverride ?? usableItemLevel}</strong>
            </span>
          </div>
          <div className={styles.levelRow}>
            <label htmlFor="sim-max-item-level" className={styles.levelLabel}>
              Max item level:
            </label>
            <input
              id="sim-max-item-level"
              type="number"
              min="1"
              max="1000"
              value={maxItemLevelOverride ?? usableItemLevel}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                if (v >= 1 && v <= 1000) setMaxItemLevelOverride(v === usableItemLevel ? null : v);
              }}
              className={styles.levelInput}
            />
            <span className={styles.levelHint}>
              Defaults to your wear limit. Circus Turma has no wear limit — set
              this to the highest item level you can actually get.
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
          {opponent
            ? "Not used while an arena opponent is set — the build is optimised for win chance against them."
            : "Set the importance (0–100) of each combat objective. Each stat's value is calibrated from arena fight simulations, so equal priorities aim for the best arena win chance against an equal opponent."}
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
                  disabled={!!opponent}
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

        {/* Powders the simulation may put on rings and the amulet */}
        <div className={styles.statToggleRow}>
          <span>Powders to try on jewellery:</span>
          {(
            [
              { key: "dexterity", label: "Dexterity" },
              { key: "agility", label: "Agility" },
              { key: "strength", label: "Strength" },
              { key: "intelligence", label: "Intelligence" },
            ] as { key: keyof PowderToggles; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className={styles.statToggle}>
              <input
                type="checkbox"
                checked={powders[key]}
                onChange={(e) =>
                  setPowders((prev) => ({
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

          {arenaVerdict && (
            <p className={styles.sectionDesc}>
              Arena win chance against <strong>{arenaVerdict.opponentName}</strong>:{" "}
              <strong>{formatPercent(arenaVerdict.optimisedWinChance)}</strong>
              {arenaVerdict.profileGearWinChance !== undefined &&
                ` (your imported gear: ${formatPercent(arenaVerdict.profileGearWinChance)})`}
              {` — verified with ${VERIFICATION_FIGHTS.toLocaleString()} simulated fights.`}
            </p>
          )}

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
