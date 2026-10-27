import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCharacterStats, type BaseStats } from '@site/src/components/CharacterPlanner/useCharacterState';

const withCharisma = (charisma: number): BaseStats => ({
  strength: 5, dexterity: 5, agility: 5, constitution: 5, charisma, intelligence: 5,
});

// Two imported Samnits with no threat items: the game showed 310 and 326 threat
test('threat from Charisma matches the game', () => {
  const low = calculateCharacterStats(new Map(), 150, withCharisma(437), new Set());
  assert.equal(low.threatFromCharisma, 310);
  assert.equal(low.threatFromItems, 0);

  const high = calculateCharacterStats(new Map(), 150, withCharisma(460), new Set());
  assert.equal(high.threatFromCharisma, 326);
});
