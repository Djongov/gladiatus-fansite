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

/** Chance (integer %) that an attacker's swing lands: their Dexterity against the target's Agility. */
export function chanceToHit(attackerDexterity: number, targetAgility: number): number {
  if (attackerDexterity + targetAgility <= 0) return 0;
  return Math.floor((attackerDexterity / (attackerDexterity + targetAgility)) * 100);
}

/**
 * Chance (unrounded %) of a second swing in the same action; may exceed 100.
 * Lower target Intelligence/Agility means more double hits, so values below 1
 * (possible with heavy negative-% affixes) are treated as 1, never as "no double hits".
 */
export function chanceToDoubleHit(
  attackerCharisma: number,
  attackerDexterity: number,
  targetIntelligence: number,
  targetAgility: number,
): number {
  return (Math.max(0, attackerCharisma) * Math.max(0, attackerDexterity) * 10) /
    (Math.max(1, targetIntelligence) * Math.max(1, targetAgility));
}

/**
 * Damage range armour absorbs per hit.
 * The maximum is verified against all 10 fighters of a live Circus Turma report;
 * the minimum is approximate (it reads about 2 low at ~450, and no simple formula fits).
 */
export function armourAbsorption(armour: number): { min: number; max: number } {
  const min = Math.max(0, Math.ceil(armour / 74 - armour / 74 / 660 + 1));
  const max = Math.max(min, Math.floor(armour / 66) + Math.floor(armour / 660));
  return { min, max };
}
