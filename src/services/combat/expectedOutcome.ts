import type { Combatant } from './types';
import { chanceToDoubleHit, chanceToHit } from './chanceFormulas';

/**
 * Analytic (closed-form) estimate of a PvP fight under the same rules as
 * simulateBattle. Thousands of times faster than Monte Carlo, so optimisers can
 * evaluate a matchup in their inner loop; use simulateOddsPvP to verify results.
 */

/** The parts of a Combatant that affect a fight's outcome. */
export type FightStats = Pick<Combatant,
  'maxHp' | 'damageMin' | 'damageMax' | 'armourAbsorbMin' | 'armourAbsorbMax' |
  'dexterity' | 'agility' | 'charisma' | 'intelligence' |
  'critChance' | 'blockChance' | 'critAvoidChance'>;

/** Rounds in an arena (PvP) fight. */
export const PVP_ROUNDS = 15;

export type RoundDamage = {
  mean: number;      // expected damage dealt per round
  variance: number;  // variance of damage dealt per round
};

export type FightEstimate = {
  attackerPerRound: RoundDamage;
  defenderPerRound: RoundDamage;
  /** Standardised margin of the attacker's lead; monotonic in winChance but never saturates. */
  zScore: number;
  /** Estimated probability (0..1) that the attacker wins. */
  winChance: number;
};

// Quantile points used to integrate over the uniform damage roll
const DAMAGE_SAMPLES = 16;
// Integration grid over the defender's total damage (in standard deviations)
const INTEGRATION_STEPS = 48;
const INTEGRATION_RANGE = 6;
// A side "threatens a kill" if its total damage reaches the target's HP within this many SDs
const KILL_THREAT_SDS = 6;

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** Inverse of normalCdf via bisection — only used to turn the final probability back into a z-score. */
function normalQuantile(p: number): number {
  let low = -12;
  let high = 12;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (normalCdf(mid) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * First and second moments of max(0, v − Y) for Y uniform on [low, high]
 * (the armour absorption roll), as a function of the damage v reaching armour.
 */
function absorbedMoments(v: number, low: number, high: number): [number, number] {
  if (high <= low) {
    const net = Math.max(0, v - low);
    return [net, net * net];
  }
  if (v <= low) return [0, 0];
  const width = high - low;
  if (v >= high) {
    const mean = v - (low + high) / 2;
    return [mean, mean * mean + (width * width) / 12];
  }
  const over = v - low;
  return [(over * over) / (2 * width), (over * over * over) / (3 * width)];
}

/** Expected damage (and its variance) one side deals to the other in a single round. */
export function expectedRoundDamage(attacker: FightStats, defender: FightStats): RoundDamage {
  const hit = chanceToHit(attacker.dexterity, defender.agility) / 100;
  const crit = Math.min(1, Math.max(0, attacker.critChance - defender.critAvoidChance) / 100);
  const block = Math.min(1, Math.max(0, defender.blockChance) / 100);
  const double = Math.min(1, chanceToDoubleHit(attacker.charisma, attacker.dexterity, defender.intelligence, defender.agility) / 100);

  // Damage multipliers before armour: crit doubles, block halves (crit + block cancel out)
  const cases: [probability: number, multiplier: number][] = [
    [(1 - crit) * (1 - block) + crit * block, 1],
    [crit * (1 - block), 2],
    [(1 - crit) * block, 0.5],
  ];

  let firstMoment = 0;
  let secondMoment = 0;
  const range = attacker.damageMax - attacker.damageMin;
  for (let i = 0; i < DAMAGE_SAMPLES; i++) {
    const rolled = attacker.damageMin + range * ((i + 0.5) / DAMAGE_SAMPLES);
    for (const [probability, multiplier] of cases) {
      if (probability === 0) continue;
      const [m1, m2] = absorbedMoments(rolled * multiplier, defender.armourAbsorbMin, defender.armourAbsorbMax);
      firstMoment += probability * m1;
      secondMoment += probability * m2;
    }
  }
  firstMoment /= DAMAGE_SAMPLES;
  secondMoment /= DAMAGE_SAMPLES;

  // One strike: hits with probability `hit`; a second strike follows with probability `double`
  const strikeMean = hit * firstMoment;
  const strikeVariance = hit * secondMoment - strikeMean * strikeMean;
  const strikes = 1 + double;
  return {
    mean: strikes * strikeMean,
    variance: strikes * strikeVariance + double * (1 - double) * strikeMean * strikeMean,
  };
}

/**
 * Estimate the attacker's chance to win a PvP fight (default 15 rounds).
 *
 * Each side's total damage over the fight is treated as normal. Integrating
 * over the defender's total `s`, the attacker wins when its own total exceeds:
 *   - s, if neither side kills (more damage wins — simulateBattle's rule);
 *   - the defender's HP, if only the attacker can kill;
 *   - s × defenderHp / attackerHp, if the defender would also kill
 *     (the attacker must remove the defender's HP faster).
 */
export function estimateFight(attacker: FightStats, defender: FightStats, maxRounds = PVP_ROUNDS): FightEstimate {
  const a = expectedRoundDamage(attacker, defender);
  const d = expectedRoundDamage(defender, attacker);
  const attackerTotalMean = maxRounds * a.mean;
  const attackerTotalSd = Math.sqrt(maxRounds * a.variance);
  const defenderTotalMean = maxRounds * d.mean;
  const defenderTotalSd = Math.sqrt(maxRounds * d.variance);
  const attackerHp = Math.max(1, attacker.maxHp);
  const defenderHp = Math.max(1, defender.maxHp);

  const damageSd = Math.sqrt(attackerTotalSd ** 2 + defenderTotalSd ** 2);
  const killThreat = (mean: number, sd: number, hp: number) => mean + KILL_THREAT_SDS * sd >= hp;
  const noKillThreat = !killThreat(attackerTotalMean, attackerTotalSd, defenderHp) &&
    !killThreat(defenderTotalMean, defenderTotalSd, attackerHp);

  // Without a kill threat the fight is decided on damage dealt: a plain normal comparison.
  // This z-score is also the ranking signal, since it keeps separating builds when the chance is near 0 or 1.
  if (noKillThreat && damageSd > 0) {
    const zScore = (attackerTotalMean - defenderTotalMean) / damageSd;
    return { attackerPerRound: a, defenderPerRound: d, zScore, winChance: normalCdf(zScore) };
  }

  const attackerExceeds = (threshold: number) => attackerTotalSd === 0
    ? (attackerTotalMean > threshold ? 1 : 0)
    : 1 - normalCdf((threshold - attackerTotalMean) / attackerTotalSd);
  const thresholdToWin = (defenderTotal: number) => defenderTotal >= attackerHp
    ? defenderTotal * defenderHp / attackerHp
    : Math.min(defenderTotal, defenderHp);

  let winChance: number;
  if (defenderTotalSd === 0) {
    winChance = attackerExceeds(thresholdToWin(defenderTotalMean));
  } else {
    // Trapezoidal integration over the defender's total, ±INTEGRATION_RANGE standard deviations
    let weightedWins = 0;
    let totalWeight = 0;
    for (let i = 0; i <= INTEGRATION_STEPS; i++) {
      const z = -INTEGRATION_RANGE + (2 * INTEGRATION_RANGE * i) / INTEGRATION_STEPS;
      const weight = Math.exp(-(z * z) / 2) * (i === 0 || i === INTEGRATION_STEPS ? 0.5 : 1);
      weightedWins += weight * attackerExceeds(thresholdToWin(defenderTotalMean + z * defenderTotalSd));
      totalWeight += weight;
    }
    winChance = weightedWins / totalWeight;
  }
  const zScore = normalQuantile(Math.min(1 - 1e-9, Math.max(1e-9, winChance)));

  return { attackerPerRound: a, defenderPerRound: d, zScore, winChance };
}
