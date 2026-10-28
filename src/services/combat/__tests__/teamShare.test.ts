import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMPTY_TEAM, decodeTeamState, encodeTeamState, teamFromUrlParam, teamReducer } from '@site/src/components/CharacterPlanner/useTeamState';
import type { EquippedItem } from '@site/src/components/CharacterPlanner/useCharacterState';
import bases from '@site/static/data/items/bases.json';
import prefixes from '@site/static/data/items/prefixes.json';

const helmet = {
  baseItem: bases.find((b) => b.type === 'helmets')!,
  prefix: prefixes.find((p) => p.name === 'Belisarius'),
  rarity: 'purple',
  conditioned: true,
} as EquippedItem;

const planned = [
  { type: 'setItem', member: 'turmaProfile', slot: 'helmet', item: helmet },
  { type: 'setRole', member: 'turmaProfile', role: 'Direct attention to oneself' },
  { type: 'setContract', mercenary: 1, contract: { typeNumber: 5, prefixId: 148, suffixId: 154, rarity: 'orange' } },
  { type: 'setRole', member: 1, role: 'Heal group members' },
] as const;
const team = planned.reduce(teamReducer, EMPTY_TEAM);

test('a shared team keeps items, contracts and roles', () => {
  const decoded = decodeTeamState(encodeTeamState(team));
  assert.ok(decoded);
  const sharedHelmet = decoded.turmaProfile.items.get('helmet');
  assert.equal(sharedHelmet?.baseItem.name, helmet.baseItem.name);
  assert.equal(sharedHelmet?.prefix?.name, 'Belisarius');
  assert.equal(sharedHelmet?.rarity, 'purple');
  assert.equal(decoded.turmaProfile.role, 'Direct attention to oneself');
  assert.deepEqual(decoded.mercenaries[1].contract, { typeNumber: 5, prefixId: 148, suffixId: 154, rarity: 'orange' });
  assert.equal(decoded.mercenaries[1].role, 'Heal group members');
  assert.equal(decoded.mercenaries[0].status, 'empty');
  // A shared team is someone else's plan: nothing in it is the reader's imported doll
  assert.ok([decoded.turmaProfile, ...decoded.mercenaries].every((member) => member.status === 'empty' || member.edited));
});

test('a broken team link decodes to nothing', () => {
  assert.equal(decodeTeamState('garbage'), null);
});

test('an old link without a team opens an empty team', () => {
  assert.equal(teamFromUrlParam(null), EMPTY_TEAM);
  assert.equal(teamFromUrlParam('garbage'), EMPTY_TEAM);
});
