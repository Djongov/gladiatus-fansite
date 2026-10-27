import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dungeonEnemyToFighter } from '../dungeonEnemy';
import type { DungeonEnemy } from '@site/src/types/dungeons';

// Papa Sasama's stat panel (Fairground)
const PAPA_SASAMA: DungeonEnemy = {
  id: 'papa-sasama', name: 'Papa Sasama', isBoss: true, image: 'Dungeons/Africa/Fairground/Papa_Sasama.jpg',
  level: 91, life: 13145,
  strength: 322, dexterity: 363, agility: 386, constitution: 275, charisma: 370, intelligence: 482,
  armour: 13252, armourAbsorb: { min: 180, max: 220 }, damage: { min: 1373, max: 1490 },
  critChance: 17, blockChance: 21, critAvoidChance: 15, threat: 50, abilities: [],
};

test('Papa Sasama becomes a fighter', () => {
  const fighter = dungeonEnemyToFighter(PAPA_SASAMA, 'https://example/papa.jpg');
  assert.equal(fighter.id, 'defender-0');
  assert.equal(fighter.side, 'defender');
  assert.equal(fighter.kind, 'enemy');
  assert.equal(fighter.tactic, 'damage');
  assert.equal(fighter.mercenaryClass, null);
  assert.equal(fighter.image, 'https://example/papa.jpg');
  assert.equal(fighter.maxLife, 13145);
  assert.equal(fighter.dexterity, 363);
  assert.equal(fighter.armour, 13252);
  assert.equal(fighter.armourAbsorbMin, 180);
  assert.equal(fighter.armourAbsorbMax, 220);
  assert.equal(fighter.damageMin, 1373);
  assert.equal(fighter.damageMax, 1490);
  assert.equal(fighter.threatStat, 50);
  assert.deepEqual(fighter.fixedChances, { crit: 17, block: 21, critAvoid: 15 });
  assert.deepEqual(fighter.abilities, []);
  assert.deepEqual(fighter.castAbilities, []);
});

const SHIELD = { rounds: [1], repeatEvery: 5, gameText: 'A hazy shimmer…', notes: null, effects: [{ type: 'shield' as const, absorb: 3000, rounds: 4 }] };
const LIFESTEAL = { rounds: [1], repeatEvery: 1, gameText: 'Corruption delights in her victim`s pain', notes: null, effects: [{ type: 'lifesteal' as const, percent: 50 }] };

test('a boss whose abilities are all worked out casts them, with passives apart', () => {
  const fighter = dungeonEnemyToFighter({ ...PAPA_SASAMA, abilities: [LIFESTEAL, SHIELD] }, null);
  assert.deepEqual(fighter.castAbilities, [{ text: 'A hazy shimmer…', rounds: [1], repeatEvery: 5, effects: SHIELD.effects }]);
  assert.deepEqual(fighter.passiveEffects, [{ type: 'lifesteal', percent: 50 }]);
});

test('a boss with any ability still unknown fights without its abilities', () => {
  const pageOnly = { rounds: [7], repeatEvery: null, gameText: 'Something only the page describes', notes: null };
  const fighter = dungeonEnemyToFighter({ ...PAPA_SASAMA, abilities: [pageOnly, SHIELD, LIFESTEAL] }, null);
  assert.deepEqual(fighter.castAbilities, []);
  assert.deepEqual(fighter.passiveEffects, []);
});
