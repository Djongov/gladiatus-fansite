import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attackAvailability } from '@site/src/components/Dungeon/attackAvailability';
import { YOUR_TURMA_PROBLEMS } from '../turmaTeam';
import { makeFighter } from './teamFixtures';

test('no usable team: Attack is disabled with the Turma page reason', () => {
  for (const status of ['missing', 'stale', 'locked', 'empty'] as const) {
    assert.deepEqual(attackAvailability({ status }), { enabled: false, reason: YOUR_TURMA_PROBLEMS[status] });
  }
});

test('a team: Attack is enabled with its fighters', () => {
  const fighter = makeFighter();
  assert.deepEqual(attackAvailability({ status: 'ok', fighters: [fighter] }), { enabled: true, fighters: [fighter] });
});
