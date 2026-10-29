/**
 * Gladiatus level-scaled chance formulas.
 * Used by calculateCharacterStats (character side) and enemyToCombatant
 * (expedition NPC side) to guarantee the two paths can't drift.
 *
 * Below level 9 these all return 0 — the crit / block / avoid-crit mechanics
 * are not active until level 9+ per existing convention in useCharacterState.
 */

export function critChanceFromAttackValue(attackValue: number, level: number): number {
  return level > 8 ? Math.min((attackValue * 52 / (level - 8)) / 5, 50) : 0;
}

export function blockChanceFromBlockValue(blockValue: number, level: number): number {
  return level > 8 ? Math.min((blockValue * 52 / (level - 8)) / 6, 50) : 0;
}

export function critAvoidChanceFromResilience(resilience: number, level: number): number {
  return level > 8 ? Math.min((resilience * 52 / (level - 8)) / 4, 25) : 0;
}

/** Damage range removed from each hit by the defender's armour. */
export function armourAbsorptionRange(armour: number): { min: number; max: number } {
  const min = Math.max(0, Math.ceil((armour / 74) - (armour / 74) / 660 + 1));
  return { min, max: Math.max(min, Math.floor((armour / 66) + (armour / 660))) };
}

/** Attacker's chance to hit (whole %, floored): Dexterity vs the defender's Agility. */
export function chanceToHit(attackerDex: number, defenderAgi: number): number {
  if (attackerDex + defenderAgi <= 0) return 0;
  return Math.floor((attackerDex / (attackerDex + defenderAgi)) * 100);
}

/**
 * Attacker's chance (%) of a second strike in the same round; may exceed 100.
 * Lower defender Intelligence/Agility means more double hits, so values below 1
 * (possible with heavy negative-% affixes) are treated as 1, never as "no double hits".
 */
export function chanceToDoubleHit(attackerCha: number, attackerDex: number, defenderInt: number, defenderAgi: number): number {
  return (Math.max(0, attackerCha) * Math.max(0, attackerDex) * 10) / (Math.max(1, defenderInt) * Math.max(1, defenderAgi));
}
