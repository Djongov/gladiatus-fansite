import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plannedRecord, toStoredTurma } from '@site/src/hooks/useActiveCharacter';
import type { ActiveCharacterRecord } from '@site/src/hooks/useActiveCharacter';
import { turmaTeamFromRecord } from '@site/src/services/combat/turmaTeam';
import { mapProfileResponse } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import type { ApiResponse } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import { decodeCharacterState, encodeCharacterState } from '@site/src/components/CharacterPlanner/useCharacterState';
import { EMPTY_TEAM, encodeTeamState, teamFromStored, teamReducer } from '@site/src/components/CharacterPlanner/useTeamState';
import { urlMatchesActiveCharacter } from '@site/src/components/CharacterPlanner/ActiveCharacterPrefill';
import type { StoredDoll, ImportedDoll } from '@site/src/components/CharacterPlanner/turmaTypes';
import samples from '@site/sample/turma-profiles.json';

// A real imported player (GODKICK), stored exactly as a login would store it
const profile = mapProfileResponse((samples as unknown as ApiResponse[]).find((sample) => sample.name === 'GODKICK')!);
const toStored = (doll: ImportedDoll): StoredDoll => doll.status !== 'ok' ? doll : {
  status: 'ok',
  encoded: encodeCharacterState(doll.level, doll.baseStats, doll.identity, doll.items, new Set()),
  identity: doll.identity,
  level: doll.level,
  role: doll.role,
  stats: doll.stats,
  contract: doll.contract,
};
const previous: ActiveCharacterRecord = {
  v: 1,
  encoded: encodeCharacterState(profile.level, profile.baseStats, profile.identity, profile.items, profile.pacts ?? new Set()),
  identity: profile.identity,
  level: profile.level,
  savedAt: 0,
  profileUrl: 'https://s51-en.gladiatus.gameforge.com/game/index.php?mod=player&p=1154605',
  stats: profile.stats,
  turma: { profile: toStored(profile.turma!.profile), mercenaries: profile.turma!.mercenaries.map(toStored) },
};

const character = {
  level: profile.level,
  baseStats: profile.baseStats,
  identity: profile.identity,
  items: profile.items,
  pacts: profile.pacts ?? new Set(),
};

test('an untouched import is written back exactly as stored', () => {
  const record = plannedRecord({ ...character, characterEdited: false, team: teamFromStored(previous.turma), previous });
  assert.deepEqual(record.stats, previous.stats);
  assert.deepEqual(record.turma, previous.turma);
  assert.equal(record.profileUrl, previous.profileUrl);
});

test('a planned team with two empty slots fights with three dolls', () => {
  let team = teamFromStored(previous.turma);
  team = teamReducer(team, { type: 'setContract', mercenary: 2, contract: null });
  team = teamReducer(team, { type: 'setContract', mercenary: 3, contract: null });
  team = { ...team, mercenaries: [team.mercenaries[0], team.mercenaries[1], EMPTY_TEAM.mercenaries[2], EMPTY_TEAM.mercenaries[3]] };
  team = teamReducer(team, { type: 'setRole', member: 0, role: 'Heal group members' });

  const record = plannedRecord({ ...character, characterEdited: true, team, previous });
  assert.deepEqual(record.turma?.mercenaries.slice(2), [{ status: 'empty' }, { status: 'empty' }]);

  const result = turmaTeamFromRecord(record, 'attacker');
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.fighters.length, 3);
  assert.equal(result.fighters[1].tactic, 'healer');
});

test('an edited mercenary is written with its planned contract and calculated numbers', () => {
  const team = teamReducer(teamFromStored(previous.turma), {
    type: 'setContract', mercenary: 0, contract: { typeNumber: 5, prefixId: 148, suffixId: 154, rarity: 'green' },
  });
  const record = plannedRecord({ ...character, characterEdited: false, team, previous });
  const mercenary = record.turma?.mercenaries[0];
  assert.equal(mercenary?.status, 'ok');
  if (mercenary?.status !== 'ok') return;
  assert.equal(mercenary.level, 120);
  assert.equal(mercenary.contract?.baseItemId, '15-5');
  assert.equal(mercenary.contract?.prefixId, 148);
  assert.equal(mercenary.stats.attributes?.dexterity.base, 364);
  // The other mercenaries were not touched
  assert.deepEqual(record.turma?.mercenaries[1], previous.turma?.mercenaries[1]);
});

test('without a previous profile the build still imports, with no profile link', () => {
  const record = plannedRecord({ ...character, characterEdited: true, team: EMPTY_TEAM, previous: null });
  assert.equal(record.profileUrl, undefined);
  assert.ok(record.stats?.lifePoints);
});

test('an edited mercenary whose contract has no affix ids keeps its stored contract', () => {
  const stored = previous.turma!.mercenaries[0] as Extract<StoredDoll, { status: 'ok' }>;
  const oldContract = { ...stored, contract: { ...stored.contract!, prefixId: undefined, suffixId: undefined } };
  const withOldContract = { ...previous, turma: { ...previous.turma!, mercenaries: [oldContract, ...previous.turma!.mercenaries.slice(1)] } };
  const team = teamReducer(teamFromStored(withOldContract.turma), { type: 'setRole', member: 0, role: 'Heal group members' });
  const mercenary = plannedRecord({ ...character, characterEdited: false, team, previous: withOldContract }).turma?.mercenaries[0];
  assert.equal(mercenary?.status, 'ok');
  if (mercenary?.status !== 'ok') return;
  assert.deepEqual(mercenary.contract, oldContract.contract);
  assert.equal(mercenary.level, stored.level);
  assert.equal(mercenary.role, 'Heal group members');
});

test('reopening the planner on its own URL counts as the logged-in character, not a shared build', () => {
  // What the planner writes into the URL after pre-filling from `previous`
  const decoded = decodeCharacterState(previous.encoded, '')!;
  const s = encodeCharacterState(decoded.level, decoded.baseStats, decoded.identity, decoded.items, decoded.pacts);
  const t = encodeTeamState(teamFromStored(previous.turma));
  assert.equal(urlMatchesActiveCharacter({ s, t }, previous), true);
  assert.equal(urlMatchesActiveCharacter({ s, t: null }, previous), true);
  assert.equal(urlMatchesActiveCharacter({ s: encodeCharacterState(1, decoded.baseStats, decoded.identity, new Map(), new Set()), t }, previous), false);
  assert.equal(urlMatchesActiveCharacter({ s, t: encodeTeamState(EMPTY_TEAM) }, previous), false);
});

test('a profile loaded in the planner brings its own Turma, written back with its own game numbers', () => {
  const other = mapProfileResponse((samples as unknown as ApiResponse[]).find((sample) => sample.name === 'Flatrows')!);
  const team = teamFromStored(toStoredTurma(other.turma!));
  const record = plannedRecord({
    level: other.level, baseStats: other.baseStats, identity: other.identity, items: other.items, pacts: other.pacts ?? new Set(),
    characterEdited: true, team, previous,
  });
  assert.deepEqual(record.turma?.mercenaries.map((doll) => doll.status === 'ok' && doll.stats), other.turma!.mercenaries.map((doll) => doll.status === 'ok' && doll.stats));
});

test('the Turma profile section 2 shows is imported even when none was imported before', () => {
  const record = plannedRecord({ ...character, characterEdited: true, team: EMPTY_TEAM, previous: null });
  assert.equal(record.turma?.profile.status, 'ok');
  if (record.turma?.profile.status !== 'ok') return;
  assert.equal(record.turma.profile.level, character.level);
  assert.equal(record.turma.profile.identity.name, character.identity.name);

  const locked = { ...EMPTY_TEAM, turmaProfile: { ...EMPTY_TEAM.turmaProfile, status: 'locked' as const } };
  assert.equal(plannedRecord({ ...character, characterEdited: true, team: locked, previous: null }).turma?.profile.status, 'locked');
});
