import type {
  CharacterIdentity,
  CharacterStats,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import { resolveCharacterPortrait } from '@site/src/utils/characterFaceImage';
import type { Combatant } from './types';
import type { ReportedTotals } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import { armourAbsorptionRange } from './chanceFormulas';
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
 * Replace planner-calculated values with the game's own profile totals, which
 * include buffs the planner cannot see. Chances (crit, block, avoidance) are
 * not shown on the profile, so the planner's values are kept for those.
 */
export function withReportedTotals(fight: FightStats, totals: ReportedTotals): FightStats {
  const absorption = armourAbsorptionRange(totals.armour);
  return {
    ...fight,
    maxHp: totals.maxHp,
    damageMin: totals.damageMin,
    damageMax: totals.damageMax,
    armourAbsorbMin: absorption.min,
    armourAbsorbMax: absorption.max,
    dexterity: totals.dexterity,
    agility: totals.agility,
    charisma: totals.charisma,
    intelligence: totals.intelligence,
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
