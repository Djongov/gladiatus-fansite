/**
 * Circus Turma rules, reverse-engineered from a live battle report
 * (see .claude/specs/2026-10-27-turma-simulator-design.md). Threat and
 * targeting are approximations kept here so they can be recalibrated alone.
 */
import type { BattleOutcome } from './types';
import type { FighterState, Tactic, TeamFighter, TeamFightRules, ThreatEvent } from './teamTypes';

const TURMA_MAX_ROUNDS = 50;

const TACTICS_BY_ROLE: Record<string, Tactic> = {
  'Direct attention to oneself': 'tank',
  'Dish out damage': 'damage',
  'Heal group members': 'healer',
};

/** The game's tactic text → tactic. Unknown text (e.g. other languages) counts as damage. */
export function tacticFromRole(role: string | null): Tactic {
  return (role && TACTICS_BY_ROLE[role.trim()]) || 'damage';
}

/** How strongly a fighter draws attacks: built-up threat, or the threat stat before any has built up. */
export function targetWeight(state: FighterState): number {
  return state.threat > 0 ? state.threat : state.fighter.threatStat;
}

export function turmaThreatGain(actor: TeamFighter, event: ThreatEvent): number {
  if (event.type === 'heal') return event.amount;
  // Exact for tanks: Skarsburning 55 swings × 2 × 1274 + 2 × 13452 damage = 167044
  if (actor.tactic === 'tank') return 2 * (actor.threatStat + event.damage);
  // Approximate for everyone else: swings that do no damage add the threat stat once
  return 2 * event.damage + (event.damage === 0 ? actor.threatStat : 0);
}

/**
 * Tanks ("Direct attention to oneself") pick at random, weighted by threat (evenly
 * when nobody has any); everyone else goes for the enemy with the highest threat
 * (first on ties). It's the tactic that decides, player or mercenary alike.
 */
export function turmaPickTarget(actor: FighterState, enemies: FighterState[], random: () => number): FighterState {
  if (actor.fighter.tactic !== 'tank') {
    return enemies.reduce((best, enemy) => (targetWeight(enemy) > targetWeight(best) ? enemy : best));
  }

  const weights = enemies.map(targetWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return enemies[Math.floor(random() * enemies.length)];

  let roll = random() * totalWeight;
  for (let index = 0; index < enemies.length; index++) {
    roll -= weights[index];
    if (roll < 0) return enemies[index];
  }
  return enemies[enemies.length - 1];
}

/** A Turma fight that runs out of rounds goes to the team with more points. */
export function turmaOutcomeAtTimeout(points: { attacker: number; defender: number }): BattleOutcome {
  if (points.attacker === points.defender) return 'draw';
  return points.attacker > points.defender ? 'attacker_wins' : 'defender_wins';
}

export const TURMA_RULES: TeamFightRules = {
  maxRounds: TURMA_MAX_ROUNDS,
  enemyEnrage: () => 1,
  pickTarget: turmaPickTarget,
  threatGain: turmaThreatGain,
  outcomeAtTimeout: turmaOutcomeAtTimeout,
};
