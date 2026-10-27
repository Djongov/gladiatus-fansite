import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lifeRows, swingLine, teamMarks } from '@site/src/components/TurmaBattleReport/reportModel';
import { makeFighter } from './teamFixtures';

const team = [
  makeFighter({ id: 'attacker-0', name: 'Skarsburning', kind: 'player', maxLife: 34250 }),
  makeFighter({ id: 'attacker-1', name: 'Grandmaster', maxLife: 15714 }),
  makeFighter({ id: 'attacker-2', name: 'Samnit', maxLife: 8090 }),
  makeFighter({ id: 'attacker-3', name: 'Samnit', maxLife: 6775 }),
  makeFighter({ id: 'attacker-4', name: 'Samnit', maxLife: 7218 }),
];

const full = Object.fromEntries(team.map((fighter) => [fighter.id, { life: fighter.maxLife, threat: 0 }]));

test('every fighter has a row of their own, mercenaries sharing a name too', () => {
  const now = {
    ...full,
    'attacker-0': { life: 34250, threat: 3800 },
    'attacker-1': { life: 15714, threat: 1600 },
    'attacker-2': { life: 8000, threat: 1500 },
    'attacker-3': { life: 6775, threat: 1500 },
    'attacker-4': { life: 7000, threat: 1600 },
  };
  const rows = lifeRows(team, now, full, '¹');

  assert.deepEqual(rows.map((row) => row.label), ['Skarsburning', 'Grandmaster¹', 'Samnit¹', 'Samnit¹', 'Samnit¹']);
  assert.deepEqual(rows.slice(2).map(({ life, maxLife, change }) => ({ life, maxLife, change })), [
    { life: 8000, maxLife: 8090, change: -90 },
    { life: 6775, maxLife: 6775, change: 0 },
    { life: 7000, maxLife: 7218, change: -218 },
  ]);
  assert.deepEqual(rows.map((row) => row.threatPercent), [38, 16, 15, 15, 16]);
});

// Dungeon reports: "Grandmaster", "Samnit" — no marks when only one team has mercenaries
test('team marks only appear when both teams have mercenaries', () => {
  const enemy = makeFighter({ id: 'defender-0', side: 'defender', kind: 'enemy', name: 'Barkskin Dwarf' });
  assert.deepEqual(teamMarks(team, [enemy]), { attacker: null, defender: null });
  assert.deepEqual(teamMarks(team, team), { attacker: '¹', defender: '²' });
  assert.deepEqual(lifeRows(team, full, full, null).map((row) => row.label), ['Skarsburning', 'Grandmaster', 'Samnit', 'Samnit', 'Samnit']);
});

test('threat share is 0 before anyone has threat', () => {
  assert.ok(lifeRows(team, full, full, '²').every((row) => row.threatPercent === 0));
});

const swing = { landed: true, isCrit: false, isBlocked: false, isDoubleHit: false, damage: 238, shieldAbsorbed: 0, shieldBroken: false };

test('swing lines read like the game log', () => {
  assert.deepEqual(swingLine({ ...swing, landed: false, damage: 0 }, 'Samnit'), [{ text: 'missed', emphasis: false, isDamage: false }]);
  assert.deepEqual(swingLine({ ...swing, isBlocked: true, damage: 0 }, 'Samnit'), [{ text: 'blocked', emphasis: false, isDamage: true }]);
  assert.deepEqual(swingLine(swing, 'Samnit'), [{ text: 'Samnit receives 238 damage', emphasis: false, isDamage: true }]);
  assert.deepEqual(swingLine({ ...swing, isCrit: true, damage: 1222 }, 'Samnit'), [{ text: 'Samnit receives 1222 damage', emphasis: true, isDamage: true }]);
});

// Clíodhna's report, rounds 1, 4 and 9
test('shield lines read like the game log', () => {
  const queen = 'Evil Fairy Queen Clíodhna';
  assert.deepEqual(swingLine({ ...swing, damage: 0, shieldAbsorbed: 591 }, queen), [{ text: `${queen} absorbs 591 damage`, emphasis: false, isDamage: false }]);
  assert.deepEqual(swingLine({ ...swing, damage: 533, shieldAbsorbed: 58, shieldBroken: true }, queen), [
    { text: `${queen} absorbs 58 damage`, emphasis: false, isDamage: false },
    { text: 'Shield removed', emphasis: true, isDamage: false },
    { text: `${queen} receives 533 damage`, emphasis: false, isDamage: true },
  ]);
  assert.deepEqual(swingLine({ ...swing, isCrit: true, damage: 788, shieldAbsorbed: 732, shieldBroken: true }, queen), [
    { text: `${queen} absorbs 732 damage`, emphasis: true, isDamage: false },
    { text: 'Shield removed', emphasis: true, isDamage: false },
    { text: `${queen} receives 788 damage`, emphasis: true, isDamage: true },
  ]);
});
