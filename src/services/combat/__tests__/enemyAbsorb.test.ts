import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armourAbsorption } from '../chanceFormulas';
import { rollEnemyAsCombatant } from '../enemyToCombatant';
import type { Enemy } from '@site/src/types/expeditions';

const fixed = (value: number) => ({ min: value, max: value });

// Expedition enemies must use the same absorb maths as players (one source of truth)
test('expedition enemies absorb with the shared armour formula', () => {
  const enemy: Enemy = {
    name: 'Test', image: '', isBoss: false,
    level: fixed(143), gold: fixed(0), experience: fixed(0), honour: fixed(0),
    strength: fixed(100), dexterity: fixed(100), agility: fixed(100),
    constitution: fixed(100), charisma: fixed(100), intelligence: fixed(100),
    armour: fixed(32986), damage: { min: fixed(100), max: fixed(200) },
    itemLevelDrop: null, life: fixed(1000), critRaw: null, blockRaw: null, avoidCritRaw: null,
  };
  const rolled = rollEnemyAsCombatant(enemy, () => 0);
  assert.ok(rolled);
  assert.equal(rolled.combatant.armourAbsorbMax, armourAbsorption(32986).max);
  assert.equal(rolled.combatant.armourAbsorbMin, armourAbsorption(32986).min);
});
