/**
 * Replays three live dungeon fights with the fighters from their reports and checks the
 * simulator lands near what really happened. The bands are loose: each report is one fight.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateTeamFight } from '../simulateTeamFight';
import { DUNGEON_RULES } from '../dungeonRules';
import type { TeamFighter } from '../teamTypes';
import { CLIODHNA_FIGHT, DWARF_LOSS, DWARF_WIN } from './fixtures/dungeonReports';
import { seededRandom } from './testRandom';

const FIGHTS = 300;

function replay(team: TeamFighter[], enemy: TeamFighter) {
  const logs = Array.from({ length: FIGHTS }, (_, seed) => simulateTeamFight(team, [enemy], DUNGEON_RULES, seededRandom(seed + 1)));
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  return {
    winRate: logs.filter((log) => log.outcome === 'attacker_wins').length / FIGHTS,
    medianRounds: median(logs.map((log) => log.rounds.length)),
    medianShieldAbsorbed: median(logs.map((log) => log.rounds
      .flatMap((round) => round.actions)
      .reduce((sum, action) => sum + (action.type === 'attack' ? action.swings.reduce((total, swing) => total + swing.shieldAbsorbed, 0) : 0), 0))),
  };
}

const assertBetween = (value: number, min: number, max: number, what: string) =>
  assert.ok(value >= min && value <= max, `${what}: ${value} is outside ${min}–${max}`);

test('Clíodhna: the full team wins in about 49 rounds, her shields soaking about 26,000', () => {
  const result = replay(CLIODHNA_FIGHT.team, CLIODHNA_FIGHT.enemy);
  assert.ok(result.winRate >= 0.95, `win rate ${result.winRate}`);
  assertBetween(result.medianRounds, 35, 60, 'median rounds');
  assertBetween(result.medianShieldAbsorbed, 20_000, 32_000, 'median shield absorbed');
});

test('Barkskin Dwarf: with one Samnit the team wins in about 72 rounds', () => {
  const result = replay(DWARF_WIN.team, DWARF_WIN.enemy);
  assert.ok(result.winRate >= 0.9, `win rate ${result.winRate}`);
  assertBetween(result.medianRounds, 60, 85, 'median rounds');
});

test('Barkskin Dwarf: without the Samnit the enrage wins, around round 140', () => {
  const result = replay(DWARF_LOSS.team, DWARF_LOSS.enemy);
  assert.ok(result.winRate <= 0.4, `win rate ${result.winRate}`);
  assertBetween(result.medianRounds, 110, 160, 'median rounds');
});
