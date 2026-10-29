import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { simulateBattle, type SimulationOptions } from '../simulateBattle';
import type { Combatant } from '../types';
import { seededRandom } from './testRandom';

// Freezes the Arena engine's behaviour: refactors of the shared strike maths
// must replay these fights exactly. Regenerate only on purpose (UPDATE_GOLDEN=1).
const FIXTURE_PATH = path.join(process.cwd(), 'src/services/combat/__tests__/fixtures/arena-golden.json');

const attacker: Combatant = {
  name: 'Attacker', level: 143, hp: 21425, maxHp: 21425,
  damageMin: 745, damageMax: 839, armour: 24978, armourAbsorbMin: 340, armourAbsorbMax: 415,
  strength: 1206, dexterity: 1594, agility: 1442, constitution: 692, charisma: 602, intelligence: 1236,
  critChance: 50, blockChance: 39, critAvoidChance: 25,
};

const defender: Combatant = {
  name: 'Defender', level: 143, hp: 34250, maxHp: 34250,
  damageMin: 799, damageMax: 897, armour: 32986, armourAbsorbMin: 449, armourAbsorbMax: 548,
  strength: 1229, dexterity: 1229, agility: 1584, constitution: 1229, charisma: 1229, intelligence: 1229,
  critChance: 40, blockChance: 46, critAvoidChance: 25,
};

const SEEDS = [1, 2, 3, 42, 1337];
const MODES: Array<[string, SimulationOptions]> = [
  ['pve', {}],
  ['pvp', { maxRounds: 15, firstAttacker: 'coinflip' }],
];

function runAll(): Record<string, unknown> {
  const logs: Record<string, unknown> = {};
  for (const [mode, options] of MODES) {
    for (const seed of SEEDS) {
      logs[`${mode}-${seed}`] = simulateBattle(attacker, defender, { ...options, random: seededRandom(seed) });
    }
  }
  return logs;
}

test('arena engine replays the golden fights exactly', () => {
  const logs = runAll();
  if (process.env.UPDATE_GOLDEN === '1') {
    mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
    writeFileSync(FIXTURE_PATH, JSON.stringify(logs, null, 1));
    return;
  }
  const golden = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(logs)), golden);
});
