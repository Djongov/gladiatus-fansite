import { test } from 'node:test';
import assert from 'node:assert/strict';
import { strikeTallyBySide } from '../simulateBattle';
import type { FighterSide, RoundEvent, StrikeEvent } from '../types';

function strike(attackerSide: FighterSide, overrides: Partial<StrikeEvent> = {}): StrikeEvent {
  return {
    attacker: 'Mirror', attackerSide, defender: 'Mirror',
    result: 'hit', isCrit: false, isBlocked: false, isSecondHalfOfDoubleHit: false,
    damageRolled: 10, damageAfterMods: 10, absorbed: 0, finalDamage: 10, defenderHpAfter: 100,
    ...overrides,
  };
}

const round = (roundIndex: number, strikes: StrikeEvent[]): RoundEvent => ({ roundIndex, firstAttacker: 'Mirror', strikes });

test('counts each side’s attacks, critical hits, misses and attacks the opponent blocked', () => {
  const rounds = [
    round(1, [
      strike('attacker', { isCrit: true }),
      strike('defender', { result: 'miss', finalDamage: 0 }),
    ]),
    round(2, [
      strike('attacker', { result: 'miss', finalDamage: 0 }),
      strike('attacker', { isSecondHalfOfDoubleHit: true, isBlocked: true }),
      strike('defender', { isCrit: true, isBlocked: true }),
    ]),
  ];

  assert.deepEqual(strikeTallyBySide(rounds), {
    attacker: { attacks: 3, criticalHits: 1, misses: 1, blockedByOpponent: 1 },
    defender: { attacks: 2, criticalHits: 1, misses: 1, blockedByOpponent: 1 },
  });
});

test('a fight with no strikes tallies zero for both sides', () => {
  const empty = { attacks: 0, criticalHits: 0, misses: 0, blockedByOpponent: 0 };
  assert.deepEqual(strikeTallyBySide([]), { attacker: empty, defender: empty });
});
