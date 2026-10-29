import { calculateCharacterStats } from './useCharacterState';
import type { BaseStats, EquippedItem, ItemSlotType } from './useCharacterState';
import type { PactId } from './PactDefinitions';
import { ATTRIBUTE_KEYS } from './turmaTypes';
import type { AttributeKey, AttributeStat, DollStats } from './turmaTypes';
import type { Tactic } from '@site/src/services/combat/teamTypes';

export type DollKind = 'character' | 'turmaProfile' | 'mercenary';

export type DollStatsInput = {
  kind: DollKind;
  level: number;
  /** Mercenary: the contract's six attributes */
  baseStats: BaseStats;
  items: Map<ItemSlotType, EquippedItem>;
  /** Turma profile: the character's pacts; mercenary: none */
  pacts: Set<PactId>;
  /** Turma profile and mercenaries: healers get no threat from Charisma. The character page shows no threat. */
  tactic?: Tactic;
  /** Mercenary only: the contract's life points (calculateMercenaryContract(...).lifePoints) */
  contractLifePoints?: number;
};

const FINAL_ATTRIBUTE: Record<AttributeKey, 'finalStrength' | 'finalDexterity' | 'finalAgility' | 'finalConstitution' | 'finalCharisma' | 'finalIntelligence'> = {
  strength: 'finalStrength',
  dexterity: 'finalDexterity',
  agility: 'finalAgility',
  constitution: 'finalConstitution',
  charisma: 'finalCharisma',
  intelligence: 'finalIntelligence',
};

/** Each point of Constitution items add to a mercenary is worth this much life (the contract's own rate). */
const MERCENARY_LIFE_PER_CONSTITUTION = 15;

/**
 * A doll's combat stats as the game's character page shows them, worked out from its gear.
 * Checked against sample/turma-profiles.json; known gaps are listed on the Missing Data page.
 */
export function calculateDollStats({ kind, level, baseStats, items, pacts, tactic, contractLifePoints }: DollStatsInput): DollStats {
  const stats = calculateCharacterStats(items, level, baseStats, pacts);

  // A mercenary's life starts from its contract; items add their health and 15 per Constitution point they add
  const lifePoints = kind === 'mercenary'
    ? (contractLifePoints ?? 0) + MERCENARY_LIFE_PER_CONSTITUTION * (stats.finalConstitution - baseStats.constitution) + stats.healthFromItems
    : stats.totalHealth;

  let threat: number | null = null;
  if (kind !== 'character') threat = tactic === 'healer' ? stats.threatFromItems : stats.totalThreat;

  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map((key): [AttributeKey, AttributeStat] => {
    const total = stats[FINAL_ATTRIBUTE[key]];
    return [key, {
      total,
      base: baseStats[key],
      max: stats.attributeMaximums[key],
      itemsApplied: total - baseStats[key],
      itemsPossible: null,
    }];
  })) as Record<AttributeKey, AttributeStat>;

  return {
    lifePoints,
    armour: stats.totalArmor,
    damageMin: stats.totalDamageMin,
    damageMax: stats.totalDamageMax,
    healing: stats.totalHealing,
    threat,
    attributes,
  };
}
