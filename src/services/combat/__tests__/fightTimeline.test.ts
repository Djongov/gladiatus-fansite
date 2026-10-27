import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beatAt, beatCaption, beatReaction, buildFightTimeline, delayBefore, lifeAt, type FightBeat } from '@site/src/components/FightReplay/fightTimeline';
import type { BattleLog, Combatant, FighterSide, StrikeEvent } from '../types';

const combatant = (name: string, maxHp: number, hp = maxHp): Combatant => ({
  name, level: 100, hp, maxHp, damageMin: 1, damageMax: 2, armour: 0, armourAbsorbMin: 0, armourAbsorbMax: 0,
  strength: 1, dexterity: 1, agility: 1, constitution: 1, charisma: 1, intelligence: 1,
  critChance: 0, blockChance: 0, critAvoidChance: 0,
});

type StrikeSpec = Partial<StrikeEvent> & { attackerSide: FighterSide; defenderHpAfter: number };

function strike(spec: StrikeSpec): StrikeEvent {
  const byAttacker = spec.attackerSide === 'attacker';
  return {
    attacker: byAttacker ? 'Hero' : 'Rat', defender: byAttacker ? 'Rat' : 'Hero',
    result: 'hit', isCrit: false, isBlocked: false, isSecondHalfOfDoubleHit: false,
    damageRolled: 0, damageAfterMods: 0, absorbed: 0, finalDamage: 0, ...spec,
  };
}

function battle(rounds: StrikeSpec[][], attacker = combatant('Hero', 1000), defender = combatant('Rat', 500)): BattleLog {
  return {
    attacker, defender,
    rounds: rounds.map((strikes, roundIndex) => ({ roundIndex, firstAttacker: 'Rat', strikes: strikes.map(strike) })),
    outcome: 'draw', outcomeReason: 'rounds_exhausted',
  };
}

test('fighters start at full life, attacker first, even when the snapshot was hurt', () => {
  const { fighters } = buildFightTimeline(battle([], combatant('Hero', 1000, 300)));
  assert.deepEqual(fighters, [
    { id: 'attacker', name: 'Hero', maxLife: 1000, startLife: 1000 },
    { id: 'defender', name: 'Rat', maxLife: 500, startLife: 500 },
  ]);
});

test('beats carry kind, flags, amount and everyone’s life after them', () => {
  const { beats } = buildFightTimeline(battle([
    [
      { attackerSide: 'defender', result: 'miss', defenderHpAfter: 1000 },
      { attackerSide: 'attacker', finalDamage: 120, defenderHpAfter: 380 },
      { attackerSide: 'attacker', isCrit: true, isBlocked: true, isSecondHalfOfDoubleHit: true, finalDamage: 80, defenderHpAfter: 300 },
    ],
    [{ attackerSide: 'defender', finalDamage: 50, defenderHpAfter: 950 }],
  ]));
  assert.deepEqual(beats.map(({ index, round, actorId, targetId, kind, blocked, doubleHit, amount }) =>
    ({ index, round, actorId, targetId, kind, blocked, doubleHit, amount })), [
    { index: 0, round: 1, actorId: 'defender', targetId: 'attacker', kind: 'miss', blocked: false, doubleHit: false, amount: 0 },
    { index: 1, round: 1, actorId: 'attacker', targetId: 'defender', kind: 'hit', blocked: false, doubleHit: false, amount: 120 },
    { index: 2, round: 1, actorId: 'attacker', targetId: 'defender', kind: 'crit', blocked: true, doubleHit: true, amount: 80 },
    { index: 3, round: 2, actorId: 'defender', targetId: 'attacker', kind: 'hit', blocked: false, doubleHit: false, amount: 50 },
  ]);
  assert.deepEqual(beats.map((beat) => beat.lifeAfter), [
    { attacker: 1000, defender: 500 },
    { attacker: 1000, defender: 380 },
    { attacker: 1000, defender: 300 },
    { attacker: 950, defender: 300 },
  ]);
});

test('fighters with the same name are told apart by side', () => {
  const log = battle([[{ attackerSide: 'defender', attacker: 'Twin', defender: 'Twin', finalDamage: 10, defenderHpAfter: 990 }]],
    combatant('Twin', 1000), combatant('Twin', 1000));
  const [beat] = buildFightTimeline(log).beats;
  assert.equal(beat.actorId, 'defender');
  assert.deepEqual(beat.lifeAfter, { attacker: 990, defender: 1000 });
});

test('a fight over on its first strike has one beat', () => {
  const timeline = buildFightTimeline(battle([[{ attackerSide: 'defender', finalDamage: 1000, defenderHpAfter: 0 }]]));
  assert.equal(timeline.beats.length, 1);
  assert.equal(timeline.beats[0].lifeAfter.attacker, 0);
});

test('positions outside the beats have no beat; life before and after them is the start and the end', () => {
  const timeline = buildFightTimeline(battle([[{ attackerSide: 'attacker', finalDamage: 100, defenderHpAfter: 400 }]]));
  assert.equal(beatAt(timeline.beats, -1), null);
  assert.equal(beatAt(timeline.beats, 1), null);
  assert.equal(beatAt(timeline.beats, 0)?.amount, 100);
  assert.deepEqual(lifeAt(timeline, -1), { attacker: 1000, defender: 500 });
  assert.deepEqual(lifeAt(timeline, 1), { attacker: 1000, defender: 400 });
  assert.deepEqual(lifeAt(buildFightTimeline(battle([])), 0), { attacker: 1000, defender: 500 });
});

test('delays: 450 to start, then the previous beat’s length, plus 450 when a new round starts', () => {
  const { beats } = buildFightTimeline(battle([
    [
      { attackerSide: 'defender', finalDamage: 10, defenderHpAfter: 990 },
      { attackerSide: 'attacker', isCrit: true, finalDamage: 20, defenderHpAfter: 480 },
      { attackerSide: 'attacker', isSecondHalfOfDoubleHit: true, finalDamage: 5, defenderHpAfter: 475 },
    ],
    [{ attackerSide: 'defender', result: 'miss', defenderHpAfter: 990 }, { attackerSide: 'attacker', defenderHpAfter: 475 }],
  ]));
  assert.deepEqual([0, 1, 2, 3, 4].map((pos) => delayBefore(beats, pos)), [450, 850, 1100, 650 + 450, 800]);
});

const beat = (overrides: Partial<FightBeat>): FightBeat => ({
  index: 0, round: 1, actorId: 'attacker', targetId: 'defender', kind: 'hit', blocked: false, doubleHit: false, amount: 100,
  lifeAfter: {}, ...overrides,
});

test('the floating text for each kind of beat', () => {
  assert.deepEqual(beatCaption(beat({})), { text: '−100', tone: 'damage', small: false });
  assert.deepEqual(beatCaption(beat({ doubleHit: true })), { text: '−100', tone: 'damage', small: true });
  assert.deepEqual(beatCaption(beat({ kind: 'crit', amount: 250 })), { text: '−250 CRIT!', tone: 'crit', small: false });
  assert.deepEqual(beatCaption(beat({ blocked: true, amount: 40 })), { text: '🛡 −40', tone: 'blocked', small: false });
  assert.deepEqual(beatCaption(beat({ kind: 'crit', blocked: true, amount: 90 })), { text: '🛡 −90 CRIT!', tone: 'blocked', small: false });
  assert.deepEqual(beatCaption(beat({ blocked: true, amount: 0 })), { text: 'Blocked', tone: 'blocked', small: false });
  assert.deepEqual(beatCaption(beat({ amount: 0 })), { text: 'Absorbed', tone: 'miss', small: false });
  assert.deepEqual(beatCaption(beat({ kind: 'miss', amount: 0 })), { text: 'Miss', tone: 'miss', small: false });
});

test('the target rocks when it takes damage, harder on a crit', () => {
  assert.equal(beatReaction(beat({})), 'rock');
  assert.equal(beatReaction(beat({ blocked: true, amount: 40 })), 'rock');
  assert.equal(beatReaction(beat({ kind: 'crit', amount: 250 })), 'rockHard');
  assert.equal(beatReaction(beat({ amount: 0 })), null);
  assert.equal(beatReaction(beat({ kind: 'miss', amount: 0 })), null);
});
