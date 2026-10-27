import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armourAbsorption, chanceToDoubleHit, chanceToHit } from '../chanceFormulas';

// Values from a live Circus Turma report (sample/dungeon_pvp_fight_report.html)

test('hit chance matches the report', () => {
  assert.equal(chanceToHit(1229, 794), 60);
  assert.equal(chanceToHit(1229, 1442), 46);
});

test('double hit chance matches the report', () => {
  assert.equal(Math.floor(chanceToDoubleHit(1229, 1229, 586, 794)), 32);
  assert.equal(Math.floor(chanceToDoubleHit(1229, 1229, 1236, 1442)), 8);
});

test('maximum armour absorption matches the report', () => {
  assert.equal(armourAbsorption(32986).max, 548);
  assert.equal(armourAbsorption(19134).max, 317);
  assert.equal(armourAbsorption(17951).max, 298);
});
