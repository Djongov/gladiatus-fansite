import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_TEAM, memberDoll, mercenaryBuild, teamFromStored, teamReducer } from '@site/src/components/CharacterPlanner/useTeamState';
import type { MercenaryMember } from '@site/src/components/CharacterPlanner/useTeamState';
import { encodeCharacterState } from '@site/src/components/CharacterPlanner/useCharacterState';
import type { BaseStats, EquippedItem } from '@site/src/components/CharacterPlanner/useCharacterState';
import type { StoredDoll, StoredTurma, MercenaryContract } from '@site/src/components/CharacterPlanner/turmaTypes';
import bases from '@site/static/data/items/bases.json';

const STATS: BaseStats = { strength: 100, dexterity: 100, agility: 100, constitution: 100, charisma: 100, intelligence: 100 };
const DOLL_STATS = { lifePoints: 1, armour: 1, damageMin: 1, damageMax: 1, healing: 1, threat: 1 };
const helmet: EquippedItem = { baseItem: bases.find((b) => b.type === 'helmets')!, rarity: 'green', conditioned: false } as EquippedItem;

function storedMercenary(role: string, contract: Partial<MercenaryContract>): StoredDoll {
  const identity = { name: 'Samnit', gender: 'male' as const };
  return {
    status: 'ok',
    encoded: encodeCharacterState(120, STATS, identity, new Map(), new Set()),
    identity,
    level: 120,
    role,
    stats: DOLL_STATS,
    contract: { name: 'Samnit', rarity: 'green', level: 120, lifePoints: 1, strength: 1, dexterity: 1, agility: 1, constitution: 1, charisma: 1, intelligence: 1, baseItemId: '15-5', ...contract },
  };
}

const storedTurma: StoredTurma = {
  profile: { status: 'locked' },
  mercenaries: [
    storedMercenary('Dish out damage', { prefixId: 148, suffixId: 154 }),
    storedMercenary('Schaden austeilen', {}),
    { status: 'empty' },
    { status: 'empty' },
  ],
};

test('teamFromStored reads contracts, keeps old contracts without affixes, and marks nothing edited', () => {
  const team = teamFromStored(storedTurma);
  assert.deepEqual(team.mercenaries[0].contract, { typeNumber: 5, prefixId: 148, suffixId: 154, rarity: 'green' });
  assert.deepEqual(team.mercenaries[1].contract, { typeNumber: 5, prefixId: undefined, suffixId: undefined, rarity: 'green' });
  assert.equal(team.mercenaries[2].status, 'empty');
  assert.equal(team.turmaProfile.status, 'locked');
  assert.ok([team.turmaProfile, ...team.mercenaries].every((member) => !member.edited));
});

test('a role the game text map doesn’t know loads as damage dealer', () => {
  assert.equal(teamFromStored(storedTurma).mercenaries[1].role, 'Dish out damage');
});

test('editing one mercenary marks only that mercenary edited', () => {
  const team = teamReducer(teamFromStored(storedTurma), { type: 'setItem', member: 1, slot: 'helmet', item: helmet });
  assert.deepEqual(team.mercenaries.map((member) => member.edited), [false, true, false, false]);
  assert.equal(team.turmaProfile.edited, false);
  assert.equal(team.mercenaries[1].items.get('helmet'), helmet);
});

test('changing the character marks only the Turma profile edited', () => {
  const team = teamReducer(teamFromStored(storedTurma), { type: 'characterChanged' });
  assert.equal(team.turmaProfile.edited, true);
  assert.ok(team.mercenaries.every((member) => !member.edited));
});

test('giving an empty slot a contract fills it', () => {
  const team = teamReducer(EMPTY_TEAM, { type: 'setContract', mercenary: 2, contract: { typeNumber: 2, rarity: 'blue' } });
  assert.equal(team.mercenaries[2].status, 'ok');
  assert.equal(team.mercenaries[2].edited, true);
});

test('mercenaryBuild turns the contract into level and base stats', () => {
  const member: MercenaryMember = { ...EMPTY_TEAM.mercenaries[0], status: 'ok', contract: { typeNumber: 5, prefixId: 148, suffixId: 154, rarity: 'green' } };
  const build = mercenaryBuild(member);
  assert.equal(build?.level, 120);
  assert.equal(build?.baseStats.dexterity, 364);
  assert.equal(mercenaryBuild(EMPTY_TEAM.mercenaries[0]), null);
});

const character = { level: 130, baseStats: STATS, pacts: new Set<never>() };

test('an unedited mercenary shows its imported level and numbers', () => {
  const doll = memberDoll(teamFromStored(storedTurma).mercenaries[1], 'mercenary', character);
  assert.equal(doll?.level, 120);
  assert.equal(doll?.stats, (storedTurma.mercenaries[1] as { stats: object }).stats);
});

test('an edited mercenary is calculated from its contract and gear', () => {
  const planned = teamReducer(teamFromStored(storedTurma), { type: 'setContract', mercenary: 2, contract: { typeNumber: 5, prefixId: 148, suffixId: 154, rarity: 'green' } });
  const team = teamReducer(planned, { type: 'setItem', member: 2, slot: 'helmet', item: helmet });
  const doll = memberDoll(team.mercenaries[2], 'mercenary', character);
  assert.equal(doll?.level, 120);
  assert.equal(doll?.baseStats.dexterity, 364);
  assert.notEqual(doll?.stats.lifePoints, 1);
  assert.equal(doll?.stats.lifePoints, doll?.contract && doll.contract.lifePoints + (doll.stats.attributes!.constitution.total - 193) * 15);
});

test('the Turma profile takes the character’s level and base stats', () => {
  const team = teamReducer(EMPTY_TEAM, { type: 'setItem', member: 'turmaProfile', slot: 'helmet', item: helmet });
  const doll = memberDoll(team.turmaProfile, 'turmaProfile', character);
  assert.equal(doll?.level, 130);
  assert.equal(doll?.baseStats, STATS);
});

test('a mercenary slot without a contract has no doll', () => {
  assert.equal(memberDoll(EMPTY_TEAM.mercenaries[0], 'mercenary', character), null);
});

test('editing gear on an imported mercenary without affix ids keeps its imported contract', () => {
  const team = teamReducer(teamFromStored(storedTurma), { type: 'setItem', member: 1, slot: 'helmet', item: helmet });
  const doll = memberDoll(team.mercenaries[1], 'mercenary', character);
  assert.equal(doll?.level, 120);
  assert.equal(doll?.baseStats.constitution, 100);
  assert.notEqual(doll?.stats, (storedTurma.mercenaries[1] as { stats: object }).stats);
});
