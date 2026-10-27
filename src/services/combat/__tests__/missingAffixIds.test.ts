import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeholderAffixes } from '@site/src/components/MissingAffixIds/MissingAffixIds';
import prefixes from '@site/static/data/items/prefixes.json';
import suffixes from '@site/static/data/items/suffixes.json';

test('affixes still on placeholder ids are found, by level, then name', () => {
  const missing = placeholderAffixes(prefixes);
  assert.equal(missing.length, 31);
  assert.deepEqual(missing[0], { name: 'Cassius`', level: 155 });
  assert.deepEqual(missing.at(-1), { name: 'Aquilius', level: 232 });
  assert.ok(!missing.some((affix) => affix.name === 'Victorinus`'), 'Victorinus` has its real id, 206');
  assert.deepEqual(placeholderAffixes(suffixes), []);
});
