import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateCharacterStats, type BaseStats } from '@site/src/components/CharacterPlanner/useCharacterState';

const withCharisma = (charisma: number): BaseStats => ({
  strength: 5, dexterity: 5, agility: 5, constitution: 5, charisma, intelligence: 5,
});

// sample/turma-profiles.json: a red Samnit (Charisma 1298) and a Turma profile (Charisma 3417) showed
// 908 and 2391 threat from Charisma. (The two costume-15 accounts get 0.71 instead; see THREAT_PER_CHARISMA.)
test('threat from Charisma matches the game', () => {
  const samnit = calculateCharacterStats(new Map(), 371, withCharisma(1298), new Set());
  assert.equal(samnit.threatFromCharisma, 908);
  assert.equal(samnit.threatFromItems, 0);

  const turmaProfile = calculateCharacterStats(new Map(), 402, withCharisma(3417), new Set());
  assert.equal(turmaProfile.threatFromCharisma, 2391);
});

test('healing is floor(Intelligence × 0.8) plus item healing', () => {
  const withIntelligence = { ...withCharisma(5), intelligence: 1351 };
  assert.equal(calculateCharacterStats(new Map(), 375, withIntelligence, new Set()).totalHealing, 1080);
});
