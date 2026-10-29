import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateTeamFight, simulateTeamOdds, teamPoints } from '../simulateTeamFight';
import { TURMA_RULES } from '../turmaRules';
import { DUNGEON_RULES } from '../dungeonRules';
import type { TeamBattleLog, TeamFighter, TeamSide } from '../teamTypes';
import { makeFighter } from './teamFixtures';
import { seededRandom } from './testRandom';

const TACTICS = ['tank', 'healer', 'damage', 'damage', 'damage'] as const;

/** A realistic Turma: the player as tank, a healer, three damage mercenaries. */
function team(side: TeamSide, size = 5, overrides: Partial<TeamFighter> = {}): TeamFighter[] {
  return Array.from({ length: size }, (_, index) =>
    makeFighter({
      id: `${side}-${index}`,
      name: `${side} ${index}`,
      side,
      kind: index === 0 ? 'player' : 'mercenary',
      tactic: TACTICS[index],
      healing: TACTICS[index] === 'healer' ? 800 : 0,
      critHealValue: TACTICS[index] === 'healer' ? 100 : 0,
      ...overrides,
    }),
  );
}

/** Fighters that can never land a hit. */
const harmless = { dexterity: 0, damageMin: 0, damageMax: 0 };
/** Fighters that always land, never double, and ignore armour. */
const sureHit = { agility: 0, armourAbsorbMin: 0, armourAbsorbMax: 0, blockValue: 0, resilience: 0 };

function actorIds(log: TeamBattleLog, roundIndex: number): string[] {
  return log.rounds[roundIndex].actions.map((action) => action.actorId);
}

test('team points are damage plus half the healing (live report totals)', () => {
  const attackerTotals = [[13452, 0], [0, 35382], [12008, 0], [7290, 0], [10923, 0]];
  const defenderTotals = [[19981, 0], [4167, 0], [7073, 0], [5098, 0], [0, 43673]];
  const toTotals = (rows: number[][]) => rows.map(([damageDone, healingDone]) => ({ damageDone, healingDone }));
  assert.equal(teamPoints(toTotals(attackerTotals)), 61364);
  assert.equal(teamPoints(toTotals(defenderTotals)), 58155);
});

test('every living fighter acts once per round', () => {
  const sturdy = { maxLife: 10_000_000, damageMin: 1, damageMax: 2 };
  const log = simulateTeamFight(team('attacker', 5, sturdy), team('defender', 5, sturdy), { ...TURMA_RULES, maxRounds: 3 }, seededRandom(1));
  assert.equal(log.rounds.length, 3);
  for (let round = 0; round < 3; round++) {
    const ids = actorIds(log, round);
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, 10);
  }
});

test('ends the moment a whole team dies', () => {
  const killers = team('attacker', 2, { damageMin: 10000, damageMax: 10000, critValue: 0 });
  const victims = team('defender', 2, { ...harmless, ...sureHit, maxLife: 10 });
  const log = simulateTeamFight(killers, victims, TURMA_RULES, seededRandom(7));

  assert.equal(log.rounds.length, 1);
  assert.equal(log.outcome, 'attacker_wins');
  assert.equal(log.outcomeReason, 'defenders_dead');
  // The fight stops on the killing blow: the last action is the attack that killed the last victim
  const lastAction = log.rounds[0].actions.at(-1);
  assert.equal(lastAction?.type, 'attack');
  assert.ok(lastAction?.actorId.startsWith('attacker'));
  assert.equal(log.rounds[0].endOfRound['defender-0'].life, 0);
  assert.equal(log.rounds[0].endOfRound['defender-1'].life, 0);
});

test('fights with uneven teams', () => {
  const log = simulateTeamFight(team('attacker', 2), team('defender', 5), TURMA_RULES, seededRandom(3));
  assert.equal(Object.keys(log.totals).length, 7);
  assert.ok(log.rounds.length >= 1 && log.rounds.length <= 50);
});

test('healer swings when nobody is wounded', () => {
  const log = simulateTeamFight(team('attacker', 2, harmless), team('defender', 2, harmless), { ...TURMA_RULES, maxRounds: 5 }, seededRandom(11));
  const healerActions = log.rounds.flatMap((round) => round.actions).filter((action) => action.actorId === 'attacker-1');
  assert.equal(healerActions.length, 5);
  assert.ok(healerActions.every((action) => action.type === 'attack'));
});

/** An ability that takes `amount` life from its owner at each round start, to set up wounds. */
const bleed = (amount: number) => ({
  id: 'bleed',
  onRoundStart(self: { life: number }) {
    self.life -= amount;
  },
});

test('heals the most wounded teammate, capped at the missing life', () => {
  const [player, healer] = team('attacker', 2);
  const lightlyHurt = { ...player, abilities: [bleed(300)] };
  const badlyHurt = makeFighter({ id: 'attacker-2', side: 'attacker', maxLife: 10000, abilities: [bleed(500)], ...harmless });
  const heals = simulateTeamFight(
    [lightlyHurt, { ...healer, healing: 1000, critHealValue: 0 }, badlyHurt],
    team('defender', 1, harmless),
    { ...TURMA_RULES, maxRounds: 1 },
    seededRandom(5),
  ).rounds[0].actions.filter((action) => action.type === 'heal');

  assert.equal(heals.length, 1);
  assert.deepEqual(heals[0], { type: 'heal', actorId: 'attacker-1', targetId: 'attacker-2', amount: 500, isCrit: false });
});

test('overkill is capped at the life the target had left', () => {
  const hitter = team('attacker', 1, { ...sureHit, damageMin: 500, damageMax: 500, critValue: 0 });
  const target = team('defender', 1, { ...harmless, ...sureHit, maxLife: 120 });
  const log = simulateTeamFight(hitter, target, TURMA_RULES, seededRandom(9));
  assert.equal(log.totals['attacker-0'].damageDone, 120);
  assert.equal(log.totals['defender-0'].damageTaken, 120);
});

test('no fighter targets, heals or acts while dead', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const attackers = team('attacker', 5, { maxLife: 4000 });
    const defenders = team('defender', 5, { maxLife: 4000 });
    const log = simulateTeamFight(attackers, defenders, TURMA_RULES, seededRandom(seed));
    const life = new Map([...attackers, ...defenders].map((fighter) => [fighter.id, fighter.maxLife]));
    for (const round of log.rounds) {
      for (const action of round.actions) {
        assert.ok(life.get(action.actorId)! > 0, `seed ${seed}: dead ${action.actorId} acted`);
        if (action.type === 'cast' || action.type === 'tick') continue;
        assert.ok(life.get(action.targetId)! > 0, `seed ${seed}: dead ${action.targetId} was targeted`);
        if (action.type === 'heal') life.set(action.targetId, life.get(action.targetId)! + action.amount);
        else for (const swing of action.swings) life.set(action.targetId, life.get(action.targetId)! - swing.damage);
      }
    }
  }
});

test('abilities can change damage and run every round', () => {
  let roundStarts = 0;
  const pacifist = makeFighter({
    id: 'attacker-0', side: 'attacker', kind: 'player', ...sureHit,
    abilities: [{ id: 'pacifist', onRoundStart: () => { roundStarts++; }, modifyOutgoingDamage: () => 0 }],
  });
  const log = simulateTeamFight([pacifist], team('defender', 1, harmless), { ...TURMA_RULES, maxRounds: 4 }, seededRandom(2));
  assert.equal(log.totals['attacker-0'].damageDone, 0);
  assert.equal(roundStarts, 4);
});

test('the same seed replays the same fight', () => {
  const run = () => simulateTeamFight(team('attacker'), team('defender'), TURMA_RULES, seededRandom(42));
  assert.deepStrictEqual(run(), run());
});

test('odds performance: 2,000 Turma fights in under 2 seconds', () => {
  const started = performance.now();
  const odds = simulateTeamOdds(team('attacker'), team('defender'), TURMA_RULES, 2000, seededRandom(1));
  const elapsed = performance.now() - started;
  assert.equal(odds.wins + odds.losses + odds.draws, 2000);
  assert.equal(odds.ran, 2000);
  assert.ok(elapsed < 2000, `took ${Math.round(elapsed)} ms`);
});

test('a dungeon timeout is a loss even when ahead on points', () => {
  const boss = makeFighter({ id: 'defender-0', side: 'defender', kind: 'enemy', maxLife: 10_000_000, ...harmless });
  const log = simulateTeamFight(team('attacker', 5, sureHit), [boss], { ...DUNGEON_RULES, maxRounds: 3 }, seededRandom(5));
  assert.equal(log.outcomeReason, 'rounds_exhausted');
  assert.ok(log.points.attacker > log.points.defender);
  assert.equal(log.outcome, 'defender_wins');
});