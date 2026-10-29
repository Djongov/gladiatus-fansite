import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeCharacterState, type BaseStats } from '@site/src/components/CharacterPlanner/useCharacterState';
import type { ImportedProfile } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import type { DollStats, ImportedDoll, StoredDoll } from '@site/src/components/CharacterPlanner/turmaTypes';
import type { ActiveCharacterRecord } from '@site/src/hooks/useActiveCharacter';
import { armourAbsorption } from '../chanceFormulas';
import { turmaTeamFromImport, turmaTeamFromRecord } from '../turmaTeam';

const PROFILE_URL = 'https://s78-en.gladiatus.gameforge.com/game/index.php?mod=player&p=15649';
const BASE_STATS: BaseStats = { strength: 500, dexterity: 900, agility: 600, constitution: 300, charisma: 400, intelligence: 350 };

function dollStats(overrides: Partial<DollStats> = {}): DollStats {
  const attribute = (total: number) => ({ total, base: total, max: null, itemsApplied: null, itemsPossible: null });
  return {
    lifePoints: 12616,
    armour: 16927,
    damageMin: 709,
    damageMax: 805,
    healing: 753,
    threat: 425,
    attributes: {
      strength: attribute(663),
      dexterity: attribute(923),
      agility: attribute(794),
      constitution: attribute(466),
      charisma: attribute(534),
      intelligence: attribute(586),
    },
    ...overrides,
  };
}

function okDoll(name: string, role: string | null, stats: DollStats = dollStats()): ImportedDoll {
  return {
    status: 'ok',
    level: 148,
    baseStats: BASE_STATS,
    items: new Map(),
    identity: { name, gender: 'male' },
    role,
    stats,
    contract: role === 'Direct attention to oneself' ? undefined : {
      name, rarity: 'blue', level: 148, gold: 1000, lifePoints: null,
      strength: null, dexterity: null, agility: null, constitution: null, charisma: null, intelligence: null,
      baseItemId: '15-3',
    },
  };
}

const EMPTY: ImportedDoll = { status: 'empty' };

const importTeam = (imported: ImportedProfile, url: string, side: 'attacker' | 'defender') =>
  turmaTeamFromImport(imported.turma, imported.pacts, url, side);

function profile(turma: ImportedProfile['turma']): ImportedProfile {
  return {
    level: 148,
    baseStats: BASE_STATS,
    items: new Map(),
    identity: { name: 'Skarsburning', gender: 'male' },
    pacts: new Set(),
    stats: dollStats(),
    turma,
    missingData: [],
  };
}

test('turmaTeamFromImport statuses', () => {
  assert.equal(importTeam(profile(undefined), PROFILE_URL, 'defender').status, 'missing');
  assert.equal(
    importTeam(profile({ profile: { status: 'locked' }, mercenaries: [EMPTY, EMPTY, EMPTY, EMPTY] }), PROFILE_URL, 'defender').status,
    'locked',
  );
  const noAttributes = okDoll('Samnit', 'Dish out damage', dollStats({ attributes: undefined }));
  assert.equal(
    importTeam(profile({ profile: okDoll('Skarsburning', 'Direct attention to oneself'), mercenaries: [noAttributes, EMPTY, EMPTY, EMPTY] }), PROFILE_URL, 'defender').status,
    'stale',
  );
  assert.equal(
    importTeam(profile({ profile: { status: 'error', error: 'x' }, mercenaries: [EMPTY, EMPTY, EMPTY, EMPTY] }), PROFILE_URL, 'defender').status,
    'empty',
  );
});

test('skips empty slots', () => {
  const result = importTeam(
    profile({
      profile: okDoll('Skarsburning', 'Direct attention to oneself'),
      mercenaries: [okDoll('Grandmaster', 'Heal group members'), EMPTY, okDoll('Samnit', 'Dish out damage'), EMPTY],
    }),
    PROFILE_URL,
    'attacker',
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.deepEqual(result.fighters.map((fighter) => fighter.id), ['attacker-0', 'attacker-1', 'attacker-2']);
  assert.deepEqual(result.fighters.map((fighter) => fighter.kind), ['player', 'mercenary', 'mercenary']);
});

test('uses the game numbers and tactics from roles', () => {
  const result = importTeam(
    profile({ profile: okDoll('Skarsburning', 'Direct attention to oneself'), mercenaries: [okDoll('Grandmaster', 'Heal group members'), EMPTY, EMPTY, EMPTY] }),
    PROFILE_URL,
    'defender',
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const [player, healer] = result.fighters;
  assert.equal(player.maxLife, 12616);
  assert.equal(player.damageMin, 709);
  assert.equal(player.threatStat, 425);
  assert.equal(player.dexterity, 923);
  assert.equal(player.armourAbsorbMax, armourAbsorption(16927).max);
  assert.equal(player.tactic, 'tank');
  assert.equal(healer.tactic, 'healer');
  // The contract (15-3) is a damage dealer, whatever tactic it was given
  assert.equal(healer.mercenaryClass, 'damage');
  assert.equal(player.mercenaryClass, null);
  assert.equal(healer.image, 'https://s78-en.gladiatus.gameforge.com/cdn/img/npc/merc/3.jpg');
  // Critical healing value from Intelligence alone (no gear): FLOOR(586 / 5)
  assert.equal(healer.critHealValue, 117);
});

test('turmaTeamFromRecord decodes stored dolls', () => {
  const stats = dollStats();
  const storedDoll = (name: string, role: string): StoredDoll => ({
    status: 'ok',
    encoded: encodeCharacterState(148, BASE_STATS, { name, gender: 'male' }, new Map(), new Set()),
    identity: { name, gender: 'male' },
    level: 148,
    role,
    stats,
  });
  const record: ActiveCharacterRecord = {
    v: 1,
    encoded: encodeCharacterState(148, BASE_STATS, { name: 'Skarsburning', gender: 'male' }, new Map(), new Set()),
    identity: { name: 'Skarsburning', gender: 'male' },
    level: 148,
    savedAt: 0,
    profileUrl: PROFILE_URL,
    stats,
    turma: { profile: storedDoll('Skarsburning', 'Direct attention to oneself'), mercenaries: [storedDoll('Samnit', 'Dish out damage'), EMPTY, EMPTY, EMPTY] },
  };

  const result = turmaTeamFromRecord(record, 'attacker');
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.fighters.length, 2);
  assert.equal(result.fighters[1].level, 148);
  assert.equal(result.fighters[1].maxLife, 12616);
  assert.equal(result.fighters[1].name, 'Samnit');

  assert.equal(turmaTeamFromRecord({ ...record, turma: undefined }, 'attacker').status, 'missing');
});
