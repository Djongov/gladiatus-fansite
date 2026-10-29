import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tacticFromRole, targetWeight, turmaPickTarget, turmaThreatGain } from '../turmaRules';
import { makeFighter, makeState } from './teamFixtures';

test('tactics come from the game role text', () => {
  assert.equal(tacticFromRole('Direct attention to oneself'), 'tank');
  assert.equal(tacticFromRole('Dish out damage'), 'damage');
  assert.equal(tacticFromRole('Heal group members'), 'healer');
  assert.equal(tacticFromRole(null), 'damage');
  assert.equal(tacticFromRole('Angriff'), 'damage');
});

/** Spreads a damage total over swings: `landed` swings share it, the rest deal 0. */
function swingThreat(fighter: ReturnType<typeof makeFighter>, landed: number, zeroSwings: number, totalDamage: number): number {
  let threat = 0;
  for (let i = 0; i < landed; i++) {
    const share = Math.floor(totalDamage / landed) + (i < totalDamage % landed ? 1 : 0);
    threat += turmaThreatGain(fighter, { type: 'swing', damage: share });
  }
  for (let i = 0; i < zeroSwings; i++) threat += turmaThreatGain(fighter, { type: 'swing', damage: 0 });
  return threat;
}

test('tank threat matches the report exactly (Skarsburning)', () => {
  const tank = makeFighter({ tactic: 'tank', threatStat: 1274 });
  assert.equal(swingThreat(tank, 28, 27, 13452), 167044);
});

test('damage dealer threat matches the report (Thracian)', () => {
  const thracian = makeFighter({ tactic: 'damage', threatStat: 425 });
  assert.equal(swingThreat(thracian, 13, 38, 4167), 24484);
});

test('a heal adds the amount healed', () => {
  const healer = makeFighter({ tactic: 'healer', threatStat: 61 });
  assert.equal(turmaThreatGain(healer, { type: 'heal', amount: 907 }), 907);
});

test('target weight uses the threat stat until threat builds up', () => {
  const fighter = makeFighter({ threatStat: 300 });
  assert.equal(targetWeight(makeState(fighter)), 300);
  assert.equal(targetWeight(makeState(fighter, { threat: 5000 })), 5000);
});

// Targeting follows the tactic, not player vs mercenary: in the Sargon report the tank
// mercenary Ares spread his swings (30/19/5), while damage dealers hit only the top threat.
test('damage dealers attack the highest threat, first on ties — even as the player', () => {
  const dealer = makeState(makeFighter({ kind: 'player', tactic: 'damage' }));
  const a = makeState(makeFighter({ id: 'defender-0', threatStat: 100 }));
  const b = makeState(makeFighter({ id: 'defender-1', threatStat: 900 }));
  const c = makeState(makeFighter({ id: 'defender-2', threatStat: 900 }));
  assert.equal(turmaPickTarget(dealer, [a, b, c], () => 0).fighter.id, 'defender-1');
  assert.equal(turmaPickTarget(dealer, [a, b, c], () => 0.99).fighter.id, 'defender-1');
});

test('healers swinging attack the highest threat', () => {
  const healer = makeState(makeFighter({ kind: 'mercenary', tactic: 'healer' }));
  const a = makeState(makeFighter({ id: 'defender-0', threatStat: 100 }));
  const b = makeState(makeFighter({ id: 'defender-1', threatStat: 900 }));
  assert.equal(turmaPickTarget(healer, [a, b], () => 0).fighter.id, 'defender-1');
});

test('tanks pick by threat weight — even as a mercenary', () => {
  const tank = makeState(makeFighter({ kind: 'mercenary', tactic: 'tank' }));
  const enemies = [
    makeState(makeFighter({ id: 'defender-0', threatStat: 100 })),
    makeState(makeFighter({ id: 'defender-1', threatStat: 900 })),
  ];
  assert.equal(turmaPickTarget(tank, enemies, () => 0).fighter.id, 'defender-0');
  assert.equal(turmaPickTarget(tank, enemies, () => 0.99).fighter.id, 'defender-1');
});

test('all-zero threat falls back to an even pick', () => {
  const player = makeState(makeFighter({ kind: 'player', tactic: 'tank' }));
  const enemies = [
    makeState(makeFighter({ id: 'defender-0', threatStat: 0 })),
    makeState(makeFighter({ id: 'defender-1', threatStat: 0 })),
  ];
  assert.equal(turmaPickTarget(player, enemies, () => 0.5).fighter.id, 'defender-1');
  assert.equal(turmaPickTarget(player, enemies, () => 0.1).fighter.id, 'defender-0');
});
