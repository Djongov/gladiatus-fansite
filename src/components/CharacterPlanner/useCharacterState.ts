import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import LZString from 'lz-string';
import { BaseItem, PrefixSuffix, ItemRarity, calculateItemStats } from '../Item';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import upgradesData from '@site/static/data/items/upgrades.json';
import { PactId, PACTS } from './PactDefinitions';
import {
  critChanceFromAttackValue,
  blockChanceFromBlockValue,
  critAvoidChanceFromResilience,
} from '@site/src/services/combat/chanceFormulas';
import { getTrainingCap } from '@site/src/utils/trainingCap';

/**
 * Compress and encode string for URL
 * Uses LZ compression to dramatically reduce URL size
 */
function compressForUrl(str: string): string {
  return LZString.compressToEncodedURIComponent(str);
}

/**
 * Decompress string from URL (LZ compression)
 */
function decompressFromUrl(str: string): string | null {
  try {
    return LZString.decompressFromEncodedURIComponent(str);
  } catch (error) {
    console.error('Failed to decompress:', error);
    return null;
  }
}

// Rarity order for compact encoding (index = value stored in URL)
const RARITIES: ItemRarity[] = ['common', 'green', 'blue', 'purple', 'orange', 'red'];

/**
 * Serialize a single EquippedItem into a minimal compact form.
 * Stores only the names of base item, prefix, suffix, and upgrades — the full
 * objects are looked up from the static data files on decode.
 */
function serializeEquippedItem(item: EquippedItem): Record<string, unknown> {
  const compact: Record<string, unknown> = {
    n: item.baseItem.name,
    r: RARITIES.indexOf(item.rarity),
    c: item.conditioned ? 1 : 0,
  };
  if (item.prefix) compact.p = item.prefix.name;
  if (item.suffix) compact.sf = item.suffix.name;
  if (item.enchantValue) compact.e = item.enchantValue;
  if (item.upgrades && item.upgrades.length > 0) {
    compact.u = item.upgrades.map(u => [u.upgrade.name, u.level]);
  }
  return compact;
}

/**
 * Deserialize a compact item back into a full EquippedItem by looking up names
 * in the static data files. Returns null if the base item cannot be found.
 */
function deserializeEquippedItem(compact: Record<string, any>): EquippedItem | null {
  const baseItem = (basesData as BaseItem[]).find(b => b.name === compact.n);
  if (!baseItem) return null;

  const rarity: ItemRarity = RARITIES[compact.r as number] ?? 'common';
  const conditioned = compact.c === 1;

  const item: EquippedItem = { baseItem, rarity, conditioned };

  if (compact.p) {
    item.prefix = (prefixesData as PrefixSuffix[]).find(p => p.name === compact.p);
  }
  if (compact.sf) {
    item.suffix = (suffixesData as PrefixSuffix[]).find(s => s.name === compact.sf);
  }
  if (compact.e !== undefined) {
    item.enchantValue = compact.e;
  }
  if (Array.isArray(compact.u)) {
    item.upgrades = (compact.u as [string, number][]).flatMap(([name, level]) => {
      const upgrade = (upgradesData as Upgrade[]).find(u => u.name === name);
      return upgrade ? [{ upgrade, level }] : [];
    });
  }

  return item;
}

/**
 * Encode all character state into a single compact URL param (v2).
 * Items are stored as name-references only — full objects are looked up on decode.
 * Stats use an array instead of named keys. All top-level keys are single chars.
 */
export function encodeCharacterState(
  level: number,
  stats: BaseStats,
  identity: CharacterIdentity,
  items: Map<ItemSlotType, EquippedItem>,
  pacts: Set<PactId>
): string {
  const state: Record<string, unknown> = {
    v: 2,
    l: level,
    s: [stats.strength, stats.dexterity, stats.agility, stats.constitution, stats.charisma, stats.intelligence],
    id: identity,
  };

  if (items.size > 0) {
    const compactItems: Record<string, unknown> = {};
    items.forEach((item, slot) => { compactItems[slot] = serializeEquippedItem(item); });
    state.b = compactItems;
  }

  if (pacts.size > 0) {
    state.pk = [...pacts];
  }

  return compressForUrl(JSON.stringify(state));
}

/**
 * Decode character state from the compact single URL param.
 * Handles v2 (compact item names) and v1/unversioned (full item objects).
 */
export function decodeCharacterState(encoded: string, randomName: string): {
  level: number;
  baseStats: BaseStats;
  identity: CharacterIdentity;
  items: Map<ItemSlotType, EquippedItem>;
  pacts: Set<PactId>;
} | null {
  try {
    const decoded = decompressFromUrl(encoded);
    if (!decoded) return null;

    const state = JSON.parse(decoded);

    const baseStats: BaseStats = {
      strength: state.s?.[0] ?? 5,
      dexterity: state.s?.[1] ?? 5,
      agility: state.s?.[2] ?? 5,
      constitution: state.s?.[3] ?? 5,
      charisma: state.s?.[4] ?? 5,
      intelligence: state.s?.[5] ?? 5,
    };

    const items = new Map<ItemSlotType, EquippedItem>();
    if (state.b) {
      const isV2 = state.v === 2;
      Object.entries(state.b).forEach(([slot, itemData]: [string, any]) => {
        if (!itemData) return;
        if (isV2) {
          const item = deserializeEquippedItem(itemData);
          if (item) items.set(slot as ItemSlotType, item);
        } else {
          // v1: full item objects stored directly
          items.set(slot as ItemSlotType, itemData as EquippedItem);
        }
      });
    }

    const pacts = new Set<PactId>();
    if (state.pk && Array.isArray(state.pk)) {
      (state.pk as string[]).forEach(id => pacts.add(id as PactId));
    }

    const level = typeof state.l === 'number' && state.l >= 1 && state.l <= 1000 ? state.l : 1;

    return {
      level,
      baseStats,
      identity: state.id ?? { name: randomName, gender: 'male' },
      items,
      pacts,
    };
  } catch {
    return null;
  }
}

export type ItemSlotType = 'helmet' | 'amulet' | 'chest' | 'gloves' | 'mainHand' | 'offHand' | 'shoes' | 'ring1' | 'ring2';

export interface Upgrade {
  name: string;
  type: 'powder' | 'enchant';
  stat: 'strength' | 'dexterity' | 'agility' | 'constitution' | 'charisma' | 'intelligence' | 'damage' | 'armour';
  applicableTo: string[];
  permanent: boolean;
  description: string;
}

export interface AppliedUpgrade {
  upgrade: Upgrade;
  level: number; // Item level of the upgrade (determines stat bonus)
}

export interface EquippedItem {
  baseItem: BaseItem;
  prefix?: PrefixSuffix;
  suffix?: PrefixSuffix;
  rarity: ItemRarity;
  conditioned: boolean;
  enchantValue?: number; // Legacy: Grindstone (+Damage) for weapons, Protective gear (+Armor) for armor
  upgrades?: AppliedUpgrade[]; // New system: powders and other upgrades
}

export interface BaseStats {
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
}

export interface CharacterIdentity {
  name: string;
  title?: string;
  costume?: string;
  gender: 'male' | 'female';
}

export interface CharacterStats {
  totalArmor: number;
  minDamageAbsorbed: number;
  maxDamageAbsorbed: number;
  totalResilience: number;
  maxResilience: number;
  critAvoidanceChance: number;
  resilienceFromAgility: number;
  resilienceFromItems: number;
  totalBlocking: number;
  maxBlocking: number;
  blockChance: number;
  blockingFromStrength: number;
  blockingFromItems: number;
  totalThreat: number;
  threatFromCharisma: number;
  threatFromItems: number;
  totalCriticalAttack: number;
  maxCriticalAttack: number;
  criticalHitChance: number;
  criticalAttackFromDexterity: number;
  criticalAttackFromItems: number;
  chanceToHit: number;
  chanceToDoubleHit: number;
  totalDamageMin: number;
  totalDamageMax: number;
  totalHealth: number;
  stats: Map<string, { flat: number; percent: number }>;
  // Damage breakdown
  damageFromWeapons: { min: number; max: number };
  damageFromStrength: number;
  damageFromItems: number;
  // Armor breakdown
  armorFromItems: number;
  armorFromEnchants: number;
  // Health breakdown
  healthFromLevel: number;
  healthFromConstitution: number;
  baseHealthFromConstitution: number;
  healthFromItems: number;
  healthRegenPerHour: number;
  // Final base stats after items, pacts, and caps applied. Used by the
  // combat engine to compute hit / double-hit chances against a specific
  // opponent at fight time.
  finalStrength: number;
  finalDexterity: number;
  finalAgility: number;
  finalConstitution: number;
  finalCharisma: number;
  finalIntelligence: number;
}

export interface CharacterState {
  equippedItems: Map<ItemSlotType, EquippedItem>;
  characterLevel: number;
  baseStats: BaseStats;
  characterIdentity: CharacterIdentity;
  setCharacterLevel: (level: number) => void;
  setBaseStats: (stats: Partial<BaseStats>) => void;
  setCharacterGender: (gender: 'male' | 'female') => void;
  setItem: (slot: ItemSlotType, item: EquippedItem | null) => void;
  removeItem: (slot: ItemSlotType) => void;
  clearAll: () => void;
  characterStats: CharacterStats;
  loadFromUrl: () => void;
  importProfile: (level: number, stats: BaseStats, items: Map<ItemSlotType, EquippedItem>, identity: CharacterIdentity, pacts?: Set<PactId>) => void;
  activePacts: Set<PactId>;
  togglePact: (id: PactId) => void;
}

/**
 * Calculate stat bonus from an upgrade based on its level
 * - Powders: level is the direct bonus amount (user enters the stat value)
 * - Grindstone (damage): level / 5 (round up)
 * - Protective gear (armour): level / 5 (round up)
 */
function calculateUpgradeBonus(upgrade: Upgrade, level: number): number {
  if (upgrade.type === 'powder') {
    // Powders: level field contains the direct bonus amount
    return level;
  } else if (upgrade.stat === 'damage' || upgrade.stat === 'armour') {
    // Grindstone and Protective gear: level / 5, round up, with a floor of 1
    // so a level-3 grindstone still contributes +1 instead of rounding to 0.
    return Math.max(1, Math.ceil(level / 5));
  }
  return 0;
}

/**
 * Calculate total character stats from equipped items, base stats, level and active pacts.
 * Exported so CompactBuildDisplay can reuse the exact same logic.
 */
export function calculateCharacterStats(
  equippedItems: Map<ItemSlotType, EquippedItem>,
  characterLevel: number,
  baseStats: BaseStats,
  activePacts: Set<PactId>
): CharacterStats {
  let totalArmor = 0;
  let totalDamageMin = 0;
  let totalDamageMax = 0;
  let totalHealth = 0;
  let bonusDamageFromItems = 0;
  let enchantDamageBonus = 0;
  let enchantArmorBonus = 0;
  const combinedStats = new Map<string, { flat: number; percent: number }>();

  equippedItems.forEach((equippedItem, slot) => {
    const itemStats = calculateItemStats(
      equippedItem.baseItem,
      equippedItem.rarity,
      equippedItem.conditioned,
      equippedItem.prefix,
      equippedItem.suffix
    );

    if (itemStats.armour) {
      totalArmor += itemStats.armour;
    } else if (itemStats.prefixArmor) {
      totalArmor += itemStats.prefixArmor;
    }

    if (equippedItem.enchantValue !== undefined) {
      // Grindstones and protective gear always contribute at least +1, even
      // when imported with a value of 0 (Gladiatus floors low-level enchant
      // bonuses to 0; we treat the presence of the enchant as a minimum of 1).
      const enchantContribution = Math.max(1, equippedItem.enchantValue);
      if (slot === 'mainHand') {
        enchantDamageBonus += enchantContribution;
      } else if (slot === 'helmet' || slot === 'chest' || slot === 'gloves' || slot === 'shoes' || slot === 'offHand') {
        enchantArmorBonus += enchantContribution;
      }
    }

    if (equippedItem.upgrades && equippedItem.upgrades.length > 0) {
      equippedItem.upgrades.forEach(appliedUpgrade => {
        const bonus = calculateUpgradeBonus(appliedUpgrade.upgrade, appliedUpgrade.level);
        if (appliedUpgrade.upgrade.stat === 'damage') {
          enchantDamageBonus += bonus;
        } else if (appliedUpgrade.upgrade.stat === 'armour') {
          enchantArmorBonus += bonus;
        } else {
          const statName = appliedUpgrade.upgrade.stat.charAt(0).toUpperCase() + appliedUpgrade.upgrade.stat.slice(1);
          const existing = combinedStats.get(statName) || { flat: 0, percent: 0 };
          combinedStats.set(statName, { flat: existing.flat + bonus, percent: existing.percent });
        }
      });
    }

    if ((slot === 'mainHand' || slot === 'offHand') && itemStats.damage) {
      totalDamageMin += itemStats.damage.min;
      totalDamageMax += itemStats.damage.max;
    }

    if (slot !== 'mainHand' && itemStats.prefixDamage !== 0) {
      bonusDamageFromItems += itemStats.prefixDamage;
    }

    totalHealth += itemStats.prefixHealth;

    itemStats.stats.forEach(stat => {
      const existing = combinedStats.get(stat.name) || { flat: 0, percent: 0 };
      combinedStats.set(stat.name, { flat: existing.flat + stat.flat, percent: existing.percent + stat.percent });
    });
  });

  const armorFromItems = totalArmor;
  const armorFromEnchants = enchantArmorBonus;
  totalArmor += enchantArmorBonus;

  const minAbsorption = Math.ceil((totalArmor / 74) - (totalArmor / 74) / 660 + 1);
  const minDamageAbsorbed = Math.max(0, minAbsorption);
  const maxDamageAbsorbed = Math.max(minDamageAbsorbed, Math.floor((totalArmor / 66) + (totalArmor / 660)));

  const agilityStat = combinedStats.get('Agility') || { flat: 0, percent: 0 };
  const agilityPercentBonus = Math.round(baseStats.agility * (agilityStat.percent / 100));
  const uncappedAgility = baseStats.agility + agilityStat.flat + agilityPercentBonus;
  const maxAgility = baseStats.agility + Math.floor(baseStats.agility / 2) + characterLevel;
  const agilityPactBonus = activePacts.has('sk_assassins') ? Math.floor(baseStats.agility / 2) : 0;
  const finalAgility = Math.min(uncappedAgility, maxAgility + agilityPactBonus);

  const hardeningValueStat = combinedStats.get('hardening value') || { flat: 0, percent: 0 };
  const resilienceFromAgility = Math.floor(finalAgility / 10);
  const resilienceFromItems = hardeningValueStat.flat;
  const totalResilience = resilienceFromAgility + resilienceFromItems;
  const maxResilience = Math.max(0, Math.floor((24.5 * 4 * (characterLevel - 8) / 52) + 1));
  const critAvoidanceChance = critAvoidChanceFromResilience(totalResilience, characterLevel);

  const strengthStat = combinedStats.get('Strength') || { flat: 0, percent: 0 };
  const strengthPercentBonus = Math.round(baseStats.strength * (strengthStat.percent / 100));
  const uncappedStrength = baseStats.strength + strengthStat.flat + strengthPercentBonus;
  const maxStrength = baseStats.strength + Math.floor(baseStats.strength / 2) + characterLevel;
  const strengthPactBonus = activePacts.has('honour_hero') ? Math.floor(baseStats.strength / 2) : 0;
  const finalStrength = Math.min(uncappedStrength, maxStrength + strengthPactBonus);

  const blockValueStat = combinedStats.get('Block value') || { flat: 0, percent: 0 };
  const blockingFromStrength = Math.floor(finalStrength / 10);
  const blockingFromItems = blockValueStat.flat;
  const totalBlocking = blockingFromStrength + blockingFromItems;
  const maxBlocking = Math.max(0, Math.floor((49.5 * 6 * (characterLevel - 8) / 52) + 1));
  const blockChance = blockChanceFromBlockValue(totalBlocking, characterLevel);

  const dexterityStat = combinedStats.get('Dexterity') || { flat: 0, percent: 0 };
  const dexterityPercentBonus = Math.round(baseStats.dexterity * (dexterityStat.percent / 100));
  const uncappedDexterity = baseStats.dexterity + dexterityStat.flat + dexterityPercentBonus;
  const maxDexterity = baseStats.dexterity + Math.floor(baseStats.dexterity / 2) + characterLevel;
  const dexterityPactBonus = activePacts.has('honour_armourer') ? Math.floor(baseStats.dexterity / 2) : 0;
  const finalDexterity = Math.min(uncappedDexterity, maxDexterity + dexterityPactBonus);

  const criticalAttackValueStat = combinedStats.get('Critical attack value') || { flat: 0, percent: 0 };
  const criticalAttackFromDexterity = Math.floor(finalDexterity / 10);
  const criticalAttackFromItems = criticalAttackValueStat.flat;
  const totalCriticalAttack = criticalAttackFromDexterity + criticalAttackFromItems;
  const maxCriticalAttack = Math.max(0, Math.floor((49.5 * 5 * (characterLevel - 8) / 52) + 1));
  const baseCritChance = critChanceFromAttackValue(totalCriticalAttack, characterLevel);
  const criticalHitChance = activePacts.has('honour_veteran') ? baseCritChance + 10 : baseCritChance;

  const chanceToHit = Math.floor((finalDexterity / (finalDexterity + maxAgility)) * 100);

  const charismaStat = combinedStats.get('Charisma') || { flat: 0, percent: 0 };
  const charismaPercentBonus = Math.round(baseStats.charisma * (charismaStat.percent / 100));
  const uncappedCharisma = baseStats.charisma + charismaStat.flat + charismaPercentBonus;
  const maxCharisma = baseStats.charisma + Math.floor(baseStats.charisma / 2) + characterLevel;
  const charismaPactBonus = activePacts.has('blessing_venus') ? Math.floor(baseStats.charisma / 2) : 0;
  const finalCharisma = Math.min(uncappedCharisma, maxCharisma + charismaPactBonus);

  const threatStat = combinedStats.get('Threat') || { flat: 0, percent: 0 };
  const threatFromCharisma = Math.floor(finalCharisma / 10);
  const threatFromItems = threatStat.flat;
  const totalThreat = threatFromCharisma + threatFromItems;

  const intelligenceStat = combinedStats.get('Intelligence') || { flat: 0, percent: 0 };
  const intelligencePercentBonus = Math.round(baseStats.intelligence * (intelligenceStat.percent / 100));
  const uncappedIntelligence = baseStats.intelligence + intelligenceStat.flat + intelligencePercentBonus;
  const maxIntelligence = baseStats.intelligence + Math.floor(baseStats.intelligence / 2) + characterLevel;
  const finalIntelligence = Math.min(uncappedIntelligence, maxIntelligence);

  const chanceToDoubleHit = (finalCharisma * finalDexterity * 10) / (maxIntelligence * maxAgility);

  const strengthDamage = Math.floor(finalStrength * 0.1);

  const constitutionStat = combinedStats.get('Constitution') || { flat: 0, percent: 0 };
  const constitutionPercentBonus = Math.round(baseStats.constitution * (constitutionStat.percent / 100));
  const uncappedConstitution = baseStats.constitution + constitutionStat.flat + constitutionPercentBonus;
  const maxConstitution = baseStats.constitution + Math.floor(baseStats.constitution / 2) + characterLevel;
  const constitutionPactBonus = activePacts.has('sk_immortals') ? Math.floor(baseStats.constitution / 2) : 0;
  const finalConstitution = Math.min(uncappedConstitution, maxConstitution + constitutionPactBonus);

  const healthFromLevel = characterLevel * 25;
  const baseHealthFromConstitution = (finalConstitution * 25) - 50;
  const healthFromConstitution = activePacts.has('blessing_jupiter')
    ? Math.floor(baseHealthFromConstitution * 1.5) : baseHealthFromConstitution;
  const healthFromItems = totalHealth;
  const maxHealth = healthFromLevel + healthFromConstitution + healthFromItems;
  const healthRegenPerHour = (characterLevel * 2) + (finalConstitution * 2);

  const weaponDamageMin = totalDamageMin;
  const weaponDamageMax = totalDamageMax;

  totalDamageMin += bonusDamageFromItems + enchantDamageBonus + strengthDamage;
  totalDamageMax += bonusDamageFromItems + enchantDamageBonus + strengthDamage;

  if (activePacts.has('honour_berserker')) {
    const berserkerBonus = Math.max(2, Math.ceil(characterLevel * 0.25));
    totalDamageMin += berserkerBonus;
    totalDamageMax += berserkerBonus;
  }

  // suppress unused-var lint for maxConstitution (used transitively)
  void maxConstitution;

  return {
    finalStrength, finalDexterity, finalAgility, finalConstitution, finalCharisma, finalIntelligence,
    totalArmor, armorFromItems, armorFromEnchants,
    minDamageAbsorbed, maxDamageAbsorbed,
    totalResilience, maxResilience, critAvoidanceChance, resilienceFromAgility, resilienceFromItems,
    totalBlocking, maxBlocking, blockChance, blockingFromStrength, blockingFromItems,
    totalThreat, threatFromCharisma, threatFromItems,
    totalCriticalAttack, maxCriticalAttack, criticalHitChance, criticalAttackFromDexterity, criticalAttackFromItems,
    chanceToHit, chanceToDoubleHit,
    totalDamageMin, totalDamageMax,
    totalHealth: maxHealth,
    stats: combinedStats,
    damageFromWeapons: { min: weaponDamageMin, max: weaponDamageMax },
    damageFromStrength: strengthDamage,
    damageFromItems: bonusDamageFromItems + enchantDamageBonus,
    healthFromLevel, healthFromConstitution, baseHealthFromConstitution, healthFromItems, healthRegenPerHour,
  };
}

// Roman names for random character generation
const ROMAN_FIRST_NAMES = [
  'Marcus', 'Gaius', 'Lucius', 'Gnaeus', 'Quintus', 'Titus', 'Aulus', 
  'Publius', 'Spurius', 'Manius', 'Servius', 'Appius', 'Decimus',
  'Tiberius', 'Sextus', 'Numerius', 'Caeso', 'Vibius', 'Volesus',
];

const ROMAN_LAST_NAMES = [
  'Antonius', 'Julius', 'Claudius', 'Cornelius', 'Fabius', 'Valerius',
  'Aemilius', 'Manlius', 'Junius', 'Aurelius', 'Calpurnius', 'Cassius',
  'Horatius', 'Octavius', 'Pompeius', 'Sergius', 'Livius', 'Tullius',
  'Sabinus', 'Flavius', 'Maximus', 'Martialis', 'Severus', 'Brutus',
];

function generateRandomRomanName(): string {
  const firstName = ROMAN_FIRST_NAMES[Math.floor(Math.random() * ROMAN_FIRST_NAMES.length)];
  const lastName = ROMAN_LAST_NAMES[Math.floor(Math.random() * ROMAN_LAST_NAMES.length)];
  return `${firstName}${lastName}`;
}

/**
 * Custom hook to manage character planner state
 * Handles equipped items, stat calculations, and URL sharing
 */
export function useCharacterState(): CharacterState {
  const [equippedItems, setEquippedItems] = useState<Map<ItemSlotType, EquippedItem>>(new Map());
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [characterIdentity, setCharacterIdentity] = useState<CharacterIdentity>(() => ({
    name: generateRandomRomanName(),
    title: undefined,
    gender: 'male',
  }));
  const [baseStats, setBaseStatsState] = useState<BaseStats>({
    strength: 5,
    dexterity: 5,
    agility: 5,
    constitution: 5,
    charisma: 5,
    intelligence: 5,
  });
  const isInitialMount = useRef(true);
  const [activePacts, setActivePacts] = useState<Set<PactId>>(new Set());

  /**
   * Load character build from URL query parameters.
   * Supports new unified 's' param and legacy separate params for backward compatibility.
   */
  const loadFromUrl = useCallback(() => {
    if (globalThis.window === undefined) return;

    try {
      const params = new URLSearchParams(globalThis.window.location.search);

      // New unified format: single 's' param with everything
      const stateParam = params.get('s');
      if (stateParam) {
        const decoded = decodeCharacterState(stateParam, generateRandomRomanName());
        if (decoded) {
          setCharacterLevel(decoded.level);
          setBaseStatsState(decoded.baseStats);
          setCharacterIdentity(decoded.identity);
          setEquippedItems(decoded.items);
          setActivePacts(decoded.pacts);
          return;
        }
      }

      // Legacy format fallback (old URLs with separate params)
      const buildData = params.get('build');
      const levelParam = params.get('level');
      const statsParam = params.get('stats');
      const identityParam = params.get('identity');

      if (levelParam) {
        const level = Number.parseInt(levelParam, 10);
        if (level >= 1 && level <= 1000) {
          setCharacterLevel(level);
        }
      }

      if (statsParam) {
        try {
          const decoded = decompressFromUrl(statsParam);
          if (decoded) {
            setBaseStatsState(JSON.parse(decoded));
          }
        } catch (e) {
          console.error('Failed to load stats from URL:', e);
        }
      }

      if (identityParam) {
        try {
          const decoded = decompressFromUrl(identityParam);
          if (decoded) {
            setCharacterIdentity(JSON.parse(decoded));
          }
        } catch (e) {
          console.error('Failed to load character identity from URL:', e);
        }
      }

      if (buildData) {
        const decoded = decompressFromUrl(buildData);
        if (!decoded) {
          console.error('Failed to decode build data from URL');
          return;
        }
        const data = JSON.parse(decoded);
        const newItems = new Map<ItemSlotType, EquippedItem>();
        Object.entries(data).forEach(([slot, itemData]: [string, any]) => {
          if (itemData) {
            newItems.set(slot as ItemSlotType, itemData);
          }
        });
        setEquippedItems(newItems);
      }
    } catch (error) {
      console.error('Failed to load build from URL:', error);
    }
  }, []);

  // Load from URL on mount
  useEffect(() => {
    loadFromUrl();
  }, [loadFromUrl]);

  // Update URL when items, level, or stats change (skip on initial mount)
  useEffect(() => {
    // Skip the first render to allow loadFromUrl to populate state first
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (globalThis.window === undefined) return;

    try {
      const url = new URL(globalThis.window.location.href);

      // Encode everything into a single compact 's' param
      url.searchParams.set('s', encodeCharacterState(characterLevel, baseStats, characterIdentity, equippedItems, activePacts));

      // Remove legacy params
      url.searchParams.delete('build');
      url.searchParams.delete('level');
      url.searchParams.delete('stats');
      url.searchParams.delete('identity');

      globalThis.window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to update URL:', error);
    }
  }, [equippedItems, characterLevel, baseStats, characterIdentity, activePacts]);

  /**
   * Set or update an item in a specific slot
   */
  const setItem = (slot: ItemSlotType, item: EquippedItem | null) => {
    setEquippedItems(prev => {
      const newItems = new Map(prev);
      if (item) {
        newItems.set(slot, item);
      } else {
        newItems.delete(slot);
      }
      return newItems;
    });
  };

  /**
   * Remove item from a slot
   */
  const removeItem = (slot: ItemSlotType) => {
    setEquippedItems(prev => {
      const newItems = new Map(prev);
      newItems.delete(slot);
      return newItems;
    });
  };

  /**
   * Clear all equipped items
   */
  const clearAll = () => {
    setEquippedItems(new Map());
  };

  /**
   * Update base stats (partial update supported)
   */
  const setBaseStats = (newStats: Partial<BaseStats>) => {
    // Calculate training cap based on character level
    const trainingCap = getTrainingCap(characterLevel);

    // Cap each stat at the training limit
    const cappedStats: Partial<BaseStats> = {};
    for (const [key, value] of Object.entries(newStats)) {
      if (typeof value === 'number') {
        cappedStats[key as keyof BaseStats] = Math.min(value, trainingCap);
      }
    }
    
    setBaseStatsState(prev => ({ ...prev, ...cappedStats }));
  };

  const togglePact = (id: PactId) => {
    const pactDef = PACTS.find(p => p.id === id);
    if (!pactDef || characterLevel < pactDef.requiredLevel) return;
    setActivePacts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Only one pact per category may be active at a time
        PACTS.filter(p => p.category === pactDef.category && p.id !== id)
          .forEach(p => next.delete(p.id));
        next.add(id);
      }
      return next;
    });
  };

  /**
   * Update character gender
   */
  const setCharacterGender = (gender: 'male' | 'female') => {
    setCharacterIdentity(prev => ({ ...prev, gender }));
  };

  /**
   * Import profile data (bulk import for level, stats, items, and identity)
   */
  const importProfile = (level: number, stats: BaseStats, items: Map<ItemSlotType, EquippedItem>, identity: CharacterIdentity, pacts?: Set<PactId>) => {
    setCharacterLevel(level);
    setBaseStatsState(stats);
    setEquippedItems(items);
    setCharacterIdentity(identity);
    if (pacts !== undefined) {
      setActivePacts(pacts);
    }
  };

  /**
   * Calculate total character stats from all equipped items
   */
  const characterStats = useMemo(
    () => calculateCharacterStats(equippedItems, characterLevel, baseStats, activePacts),
    [equippedItems, baseStats, characterLevel, activePacts]
  );

  return {
    equippedItems,
    characterLevel,
    baseStats,
    characterIdentity,
    setCharacterLevel,
    setBaseStats,
    setCharacterGender,
    setItem,
    removeItem,
    clearAll,
    characterStats,
    loadFromUrl,
    importProfile,
    activePacts,
    togglePact,
  };
}
