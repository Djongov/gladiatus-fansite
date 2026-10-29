import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockAgainstFromBase, blockChanceAgainst, critChance, critHealChance, doubleHitChance, hitChance, ownCritAvoidChance, ownCritChance } from '../teamChances';
import { critChanceFromAttackValue } from '../chanceFormulas';
import { makeFighter } from './teamFixtures';

// Every block column of the live report: +2% per level the attacker is below the blocker, capped at 50
test('block chance rises against lower-level attackers', () => {
  assert.equal(blockAgainstFromBase(17, 148, 147), 19);
  assert.equal(blockAgainstFromBase(17, 148, 150), 17);
  assert.equal(blockAgainstFromBase(17, 148, 141), 31);
  assert.equal(blockAgainstFromBase(4, 150, 137), 30);
  assert.equal(blockAgainstFromBase(4, 150, 149), 6);
  assert.equal(blockAgainstFromBase(46, 143, 137), 50);
});

// Sargon report: 43 crits landed where crit × (1 − avoid) predicts 44 and crit − avoid predicts 23
test('crit avoidance scales the crit chance down instead of subtracting', () => {
  // Level 60 keeps the numbers round: 200 crit value → 40%, 100 resilience → 25% avoid
  const attacker = makeFighter({ level: 60, critValue: 200 });
  const target = makeFighter({ level: 60, resilience: 100 });
  assert.equal(critChance(attacker, target), 30);
});

test('critical healing chance matches the report', () => {
  assert.equal(Math.ceil(critHealChance(makeFighter({ critHealValue: 245, level: 143 }))), 12);
  assert.equal(critHealChance(makeFighter({ critHealValue: 245, level: 8 })), 0);
});

test('hit and double hit use the attacker against the target', () => {
  const attacker = makeFighter({ dexterity: 1229, charisma: 1229 });
  const target = makeFighter({ agility: 794, intelligence: 586 });
  assert.equal(hitChance(attacker, target), 60);
  assert.equal(Math.floor(doubleHitChance(attacker, target)), 32);
});

// Dungeon enemies carry their stat panel's percentages (Papa Sasama: 17 / 21 / 15), as expedition mobs do
test('fixed chances override the formulas', () => {
  const enemy = makeFighter({ level: 91, critValue: 0, blockValue: 0, resilience: 0, fixedChances: { crit: 17, block: 21, critAvoid: 15 } });
  const player = makeFighter({ level: 82, critValue: 200, resilience: 0 });
  assert.equal(critChance(enemy, player), 17);
  assert.equal(blockChanceAgainst(enemy, makeFighter({ level: 91 })), 21);
  assert.equal(critChance(player, enemy), critChanceFromAttackValue(200, 82) * 0.85);
  assert.equal(ownCritChance(enemy), 17);
  assert.equal(ownCritAvoidChance(enemy), 15);
});
