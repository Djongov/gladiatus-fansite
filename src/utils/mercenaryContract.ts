import type { ItemRarity, PrefixSuffix } from '@site/src/components/Item';
import { ATTRIBUTE_KEYS } from '@site/src/components/CharacterPlanner/turmaTypes';
import type { AttributeKey, MercenaryContract } from '@site/src/components/CharacterPlanner/turmaTypes';
import { RARITY_MULTIPLIERS } from './rarity';

/*
 * How the game builds a mercenary contract from its type, hidden prefix/suffix and rarity.
 * Derived from 92 real contracts (sample/mercenary-contracts.json), all reproduced exactly.
 */

export type MercenaryRarity = Exclude<ItemRarity, 'common'>;

/** Contract type "15-N": the game's English name and its per-level coefficient for each attribute. */
type MercenaryType = { name: string; coefficients: Record<AttributeKey, number> };

function coefficients(strength: number, dexterity: number, agility: number, constitution: number, charisma: number, intelligence: number) {
  return { strength, dexterity, agility, constitution, charisma, intelligence };
}

/** Keyed by N of contract "15-N". Each country runs tank, healer, then three damage dealers. */
export const MERCENARY_TYPES: Record<number, MercenaryType> = {
  1: { name: 'Hoplomachus', coefficients: coefficients(3, 1, 1.8, 2.1, 3, 1) },
  2: { name: 'Medicus', coefficients: coefficients(1, 1, 1, 1.2, 1.2, 2.8) },
  3: { name: 'Thracian', coefficients: coefficients(1.8, 2.6, 2.1, 1.8, 1.2, 1.5) },
  4: { name: 'Murmillo', coefficients: coefficients(2, 2.8, 2, 1.5, 1.5, 1.2) },
  5: { name: 'Samnit', coefficients: coefficients(2.2, 3, 1.9, 1.2, 1.2, 1.5) },
  6: { name: 'Elite Spear Carrier', coefficients: coefficients(2.1, 1, 3, 1.8, 3, 1) },
  7: { name: 'Medicine man', coefficients: coefficients(1, 1, 1, 1.3, 1, 3) },
  8: { name: 'Archer', coefficients: coefficients(2, 2.1, 2.4, 1.5, 1.5, 1.5) },
  9: { name: 'Experienced archer', coefficients: coefficients(2, 2.4, 2.6, 1.5, 1.5, 1) },
  10: { name: 'Sword Wolf', coefficients: coefficients(2.1, 2.1, 2.8, 1.8, 1.2, 1) },
  11: { name: 'Eagle Wing', coefficients: coefficients(2.1, 1, 1.8, 3, 3, 1) },
  12: { name: 'Herbalist', coefficients: coefficients(1, 1, 1, 1.6, 1.2, 2.6) },
  13: { name: 'Bear Warrior', coefficients: coefficients(2.6, 1.8, 2.1, 1.5, 1.5, 1.5) },
  14: { name: 'Scorpion Warrior', coefficients: coefficients(2.8, 2.4, 2.2, 1.2, 1.2, 1.2) },
  15: { name: 'Axe Warrior', coefficients: coefficients(3, 1.5, 1.8, 2.1, 1.1, 1.5) },
  16: { name: 'Grandmaster', coefficients: coefficients(1.8, 1, 3, 2.1, 3, 1) },
  17: { name: 'Druid Master', coefficients: coefficients(1, 1, 1, 1, 1.3, 3.2) },
  18: { name: 'The Ranger', coefficients: coefficients(2.4, 2.2, 1.8, 1.4, 1.7, 1.5) },
  // From a single orange contract; every other type rests on several
  19: { name: 'Axe Thrower', coefficients: coefficients(2.8, 2.6, 2.1, 1.1, 1.3, 1.1) },
  20: { name: 'Chariot Driver', coefficients: coefficients(3.2, 2, 1.6, 1.4, 1.4, 1.4) },
};

/** Contracts scale attributes far less than gear does: +5% per rarity step. */
const MERCENARY_ATTRIBUTE_MULTIPLIERS: Record<MercenaryRarity, number> = {
  green: 1.0,
  blue: 1.05,
  purple: 1.1,
  orange: 1.15,
  red: 1.2,
};

/** Every contract attribute starts at coefficient × level + this. */
const ATTRIBUTE_BASE = 4;
/** Only an affix's flat attribute counts (percentages are ignored), at 1.5×. */
const AFFIX_FLAT_WEIGHT = 1.5;
const LIFE_PER_LEVEL = 25;
const LIFE_PER_CONSTITUTION = 15;

export type CalculatedContract = { name: string; level: number; lifePoints: number } & Record<AttributeKey, number>;

function affixFlat(prefix: PrefixSuffix | undefined, suffix: PrefixSuffix | undefined, stat: string): number {
  return (prefix?.stats[stat]?.flat ?? 0) + (suffix?.stats[stat]?.flat ?? 0);
}

/** The contract the game builds for this type, hidden affixes and rarity: level, attributes and life as its tooltip shows them. */
export function calculateMercenaryContract({ typeNumber, prefix, suffix, rarity }: {
  typeNumber: number;
  prefix?: PrefixSuffix;
  suffix?: PrefixSuffix;
  rarity: MercenaryRarity;
}): CalculatedContract {
  const type = MERCENARY_TYPES[typeNumber];
  const level = (prefix?.level ?? 0) + (suffix?.level ?? 0) + 1;

  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((attribute) => {
    const raw = type.coefficients[attribute] * level + ATTRIBUTE_BASE + AFFIX_FLAT_WEIGHT * affixFlat(prefix, suffix, attribute);
    return [attribute, Math.round(raw * MERCENARY_ATTRIBUTE_MULTIPLIERS[rarity])];
  })) as Record<AttributeKey, number>;

  // Level and health scale with the normal gear multiplier. Keep this float order: 25 × 112 × 1.15
  // evaluates to 3219.999… and floors to 3219, exactly as the game shows it.
  const levelLife = Math.floor((LIFE_PER_LEVEL * level + affixFlat(prefix, suffix, 'health')) * RARITY_MULTIPLIERS[rarity]);
  const lifePoints = levelLife + LIFE_PER_CONSTITUTION * attributes.constitution;

  return { name: type.name, level, lifePoints, ...attributes };
}

/** Tooltip lines as the game's contract shows them: "Life points: 9072", then the six attributes, plain numbers. */
export function contractTooltipLines(contract: Pick<MercenaryContract, 'lifePoints' | AttributeKey>): string[] {
  const lines: Array<[string, number | null]> = [
    ['Life points', contract.lifePoints],
    ['Strength', contract.strength],
    ['Dexterity', contract.dexterity],
    ['Agility', contract.agility],
    ['Constitution', contract.constitution],
    ['Charisma', contract.charisma],
    ['Intelligence', contract.intelligence],
  ];
  return lines.filter(([, value]) => value !== null).map(([label, value]) => `${label}: ${value}`);
}

/** The gold the game colours contract stat lines in. */
export const CONTRACT_STAT_COLOUR = '#BA9700';
