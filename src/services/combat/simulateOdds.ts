import type { Enemy } from '@site/src/types/expeditions';
import type { Combatant } from './types';
import { simulateBattle, type SimulationOptions } from './simulateBattle';
import { rollEnemyAsCombatant } from './enemyToCombatant';

export type OddsResult = {
  total: number;
  ran: number;
  wins: number;
  losses: number;
  draws: number;
};

/**
 * PvE: run `n` fights against an `enemy` whose stats roll within a level range.
 * Each iteration rolls a fresh enemy level + a fresh battle RNG.
 */
export function simulateOdds(
  player: Combatant,
  enemy: Enemy,
  n = 100,
  options?: SimulationOptions,
): OddsResult {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let ran = 0;
  for (let i = 0; i < n; i++) {
    const rolled = rollEnemyAsCombatant(enemy);
    if (!rolled) break;
    const log = simulateBattle(player, rolled.combatant, options);
    ran++;
    if (log.outcome === 'attacker_wins') wins++;
    else if (log.outcome === 'defender_wins') losses++;
    else draws++;
  }
  return { total: n, ran, wins, losses, draws };
}

/**
 * PvP: run `n` fights between two fixed combatants. Defaults to PvP rules:
 * 15-round cap and per-round coinflip for who strikes first. Each iteration
 * re-runs the battle with fresh RNG; both combatants are static (no level
 * range to roll).
 */
export function simulateOddsPvP(
  attacker: Combatant,
  defender: Combatant,
  n = 100,
  options: SimulationOptions = { maxRounds: 15, firstAttacker: 'coinflip' },
): OddsResult {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (let i = 0; i < n; i++) {
    const log = simulateBattle(attacker, defender, options);
    if (log.outcome === 'attacker_wins') wins++;
    else if (log.outcome === 'defender_wins') losses++;
    else draws++;
  }
  return { total: n, ran: n, wins, losses, draws };
}

export type OddsPercentages = {
  wins: number;
  losses: number;
  draws: number;
};

/**
 * Convert raw fight counts into whole-number percentages that always sum to
 * exactly 100. Rounding each share independently can produce totals like 101%
 * (e.g. 995/5/0 → 100% + 1% + 0%), so this uses the largest-remainder method:
 * floor every share, then hand the leftover points to the shares with the
 * biggest fractional parts (ties favour the smaller share).
 */
export function oddsToPercentages(
  result: Pick<OddsResult, 'ran' | 'wins' | 'losses' | 'draws'>,
): OddsPercentages {
  const { ran, wins, losses, draws } = result;
  const shares = [wins, losses, draws].map((count) => (count / ran) * 100);
  const floored = shares.map(Math.floor);
  let remaining = 100 - floored.reduce((sum, value) => sum + value, 0);

  const byRemainder = shares
    .map((share, index) => ({ index, remainder: share - floored[index] }))
    // Ties go to the smaller share so a handful of losses never displays as 0%.
    .sort((a, b) => b.remainder - a.remainder || floored[a.index] - floored[b.index]);
  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    floored[index] += 1;
    remaining -= 1;
  }

  return { wins: floored[0], losses: floored[1], draws: floored[2] };
}
