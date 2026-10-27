import { test } from 'node:test';
import assert from 'node:assert/strict';
import { expeditionPanelValues } from '@site/src/components/EnemyStatsPanel/expeditionPanelValues';
import type { Enemy } from '@site/src/types/expeditions';

const span = (min: number, max = min) => ({ min, max });

// Teuton Camp, from expeditions.json
const TEUTON_HERO: Enemy = {
  isBoss: false, name: 'Teuton Hero', image: 'Expeditions/Germania/Teuton_Camp/Teuton_Hero.jpg',
  level: span(113, 116), gold: span(5230, 8193), experience: span(11, 15), honour: span(514, 950),
  strength: span(342, 348), dexterity: span(339, 348), agility: span(474, 487),
  constitution: span(339, 348), charisma: span(593, 609), intelligence: span(203, 208),
  armour: span(7378, 8878), damage: { min: span(226, 277), max: span(232, 285) },
  itemLevelDrop: span(106, 120), life: span(7644), critRaw: 13, blockRaw: 7, avoidCritRaw: 0,
};

test('an expedition enemy’s panel shows its stats across its levels', () => {
  assert.deepEqual(expeditionPanelValues(TEUTON_HERO), {
    life: '7644',
    attributes: {
      strength: '342-348', dexterity: '339-348', agility: '474-487',
      constitution: '339-348', charisma: '593-609', intelligence: '203-208',
    },
    armour: '7378-8878',
    damage: '226-277/232-285',
    // The simulator's chances: crit is the raw value, block grows with Strength and level, crit avoidance is always 0
    critChance: '13%',
    blockChance: '16%-17%',
    critAvoidChance: '0%',
  });
});

test('single values stay single; a single-level enemy has one damage range', () => {
  const values = expeditionPanelValues({
    ...TEUTON_HERO, level: span(120), strength: span(456), damage: { min: span(500), max: span(620) }, critRaw: 70, blockRaw: 30,
  });
  assert.equal(values.attributes.strength, '456');
  assert.equal(values.damage, '500-620');
  assert.equal(values.critChance, '50%');
  assert.equal(values.blockChance, '30%');
});

test('an enemy without combat data shows no life', () => {
  assert.equal(expeditionPanelValues({ ...TEUTON_HERO, life: null }).life, '—');
});
