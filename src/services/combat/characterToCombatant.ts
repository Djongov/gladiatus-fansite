import type {
  CharacterIdentity,
  CharacterStats,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import { resolveCharacterPortrait } from '@site/src/utils/characterFaceImage';
import type { Combatant } from './types';
import type { DollStats } from '@site/src/components/CharacterPlanner/turmaTypes';
import { armourAbsorption } from './chanceFormulas';
import type { FightStats } from './expectedOutcome';

/** The fight-relevant numbers of a planner character. */
export function fightStatsFromCharacterStats(stats: CharacterStats): FightStats {
  return {
    maxHp: stats.totalHealth,
    damageMin: stats.totalDamageMin,
    damageMax: stats.totalDamageMax,
    armourAbsorbMin: stats.minDamageAbsorbed,
    armourAbsorbMax: stats.maxDamageAbsorbed,
    dexterity: stats.finalDexterity,
    agility: stats.finalAgility,
    charisma: stats.finalCharisma,
    intelligence: stats.finalIntelligence,
    critChance: stats.criticalHitChance,
    blockChance: stats.blockChance,
    critAvoidChance: stats.critAvoidanceChance,
  };
}

/**
 * Replace planner-calculated values with the game's own profile stats, which
 * include buffs the planner cannot see. Missing values and chances (crit, block,
 * avoidance — not shown on the profile) keep the planner's values.
 */
export function withProfileStats(fight: FightStats, profile: DollStats): FightStats {
  const attributes = profile.attributes;
  const armour = profile.armour === null ? null : armourAbsorption(profile.armour);
  return {
    ...fight,
    maxHp: profile.lifePoints ?? fight.maxHp,
    damageMin: profile.damageMin ?? fight.damageMin,
    damageMax: profile.damageMax ?? fight.damageMax,
    armourAbsorbMin: armour?.min ?? fight.armourAbsorbMin,
    armourAbsorbMax: armour?.max ?? fight.armourAbsorbMax,
    dexterity: attributes?.dexterity.total ?? fight.dexterity,
    agility: attributes?.agility.total ?? fight.agility,
    charisma: attributes?.charisma.total ?? fight.charisma,
    intelligence: attributes?.intelligence.total ?? fight.intelligence,
  };
}

export function characterToCombatant(args: {
  identity: CharacterIdentity;
  level: number;
  stats: CharacterStats;
}): Combatant {
  const { identity, level, stats } = args;
  return {
    name: identity.name,
    // Use the imported costume URL if available; otherwise fall back to the
    // level-bucketed default face image. Same logic the Character Planner
    // uses via PlayerName.tsx — both call into utils/characterFaceImage.
    image: resolveCharacterPortrait({
      costume: identity.costume,
      level,
      gender: identity.gender,
    }),
    costume: identity.costume,
    gender: identity.gender,
    level,
    ...fightStatsFromCharacterStats(stats),
    hp: stats.totalHealth,
    armour: stats.totalArmor,
    strength: stats.finalStrength,
    constitution: stats.finalConstitution,
  };
}
