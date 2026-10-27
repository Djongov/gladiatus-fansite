import { test } from 'node:test';
import assert from 'node:assert/strict';
import { damageDealtBySide, simulateBattle } from '../simulateBattle';
import type { Combatant } from '../types';
import { seededRandom } from './testRandom';

/** A fighter who can't die in a few rounds and always hits (no crit, no block). */
function fighter(name: string, overrides: Partial<Combatant> = {}): Combatant {
  return {
    name, level: 100, hp: 1_000_000, maxHp: 1_000_000,
    damageMin: 10, damageMax: 10, armour: 0, armourAbsorbMin: 0, armourAbsorbMax: 0,
    strength: 100, dexterity: 1_000_000, agility: 0, constitution: 100, charisma: 0, intelligence: 100,
    critChance: 0, blockChance: 0, critAvoidChance: 0,
    ...overrides,
  };
}

test('every strike records which side struck', () => {
  const log = simulateBattle(fighter('Alpha'), fighter('Beta'), { random: seededRandom(3), firstAttacker: 'coinflip', maxRounds: 15 });
  const strikes = log.rounds.flatMap((round) => round.strikes);
  assert.ok(strikes.length > 0);
  for (const strike of strikes) {
    assert.equal(strike.attackerSide, strike.attacker === 'Alpha' ? 'attacker' : 'defender');
  }
});

test('a mirror fight that runs out of rounds totals damage by side, not by name', () => {
  // Same name on both sides; the defender hits harder and nobody can die
  const log = simulateBattle(fighter('Mirror', { damageMin: 1, damageMax: 1 }), fighter('Mirror', { damageMin: 50, damageMax: 50 }), { random: seededRandom(1), maxRounds: 5 });
  assert.equal(log.outcomeReason, 'rounds_exhausted');
  assert.equal(log.outcome, 'defender_wins');
});

test('damage dealt is totalled per side, so a mirror fight’s report agrees with its winner', () => {
  const log = simulateBattle(fighter('Mirror', { damageMin: 1, damageMax: 1 }), fighter('Mirror', { damageMin: 50, damageMax: 50 }), { random: seededRandom(1), maxRounds: 5 });
  assert.deepEqual(damageDealtBySide(log.rounds), { attacker: 5, defender: 250 });
});
