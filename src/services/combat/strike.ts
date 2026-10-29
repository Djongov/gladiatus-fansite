/**
 * A single swing's dice, shared by the Arena (1v1) and team (Turma) engines.
 * The order of random() calls is part of the contract — hit, damage, crit,
 * block, absorb — so seeded fights replay identically across refactors.
 */

export type StrikeChances = {
  hit: number;   // %
  crit: number;  // %
  block: number; // %
};

export type StrikeRoll = {
  landed: boolean;
  isCrit: boolean;
  isBlocked: boolean;
  damageRolled: number;
  damageAfterMods: number;
  absorbed: number;
  finalDamage: number;
};

export function rollInt(random: () => number, min: number, max: number): number {
  if (max < min) return min;
  return Math.floor(random() * (max - min + 1)) + min;
}

const MISSED: StrikeRoll = {
  landed: false,
  isCrit: false,
  isBlocked: false,
  damageRolled: 0,
  damageAfterMods: 0,
  absorbed: 0,
  finalDamage: 0,
};

export function rollStrike(
  chances: StrikeChances,
  damage: { min: number; max: number },
  absorb: { min: number; max: number },
  random: () => number,
): StrikeRoll {
  if (random() * 100 >= chances.hit) return { ...MISSED };

  const damageRolled = rollInt(random, damage.min, damage.max);
  const isCrit = random() * 100 < chances.crit;
  let damageAfterMods = isCrit ? damageRolled * 2 : damageRolled;

  const isBlocked = random() * 100 < chances.block;
  if (isBlocked) damageAfterMods = Math.floor(damageAfterMods / 2);

  const absorbed = rollInt(random, absorb.min, absorb.max);
  const finalDamage = Math.max(0, damageAfterMods - absorbed);

  return { landed: true, isCrit, isBlocked, damageRolled, damageAfterMods, absorbed, finalDamage };
}
