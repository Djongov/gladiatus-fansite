import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeholderAffixes } from '@site/src/components/MissingAffixIds/MissingAffixIds';
import prefixes from '@site/static/data/items/prefixes.json';
import suffixes from '@site/static/data/items/suffixes.json';

test('affixes still on placeholder ids are found, by level, then name', () => {
  const missing = placeholderAffixes(prefixes);
  assert.equal(missing.length, 14);
  assert.deepEqual(missing[0], { name: 'Darius`', level: 155 });
  assert.deepEqual(missing.at(-1), { name: 'Bassianus`', level: 217 });
  assert.ok(!missing.some((affix) => affix.name === 'Victorinus`'), 'Victorinus` has its real id, 206');
  // Real ids learned from players' "missing ids" reports
  const fixedFromReports: Record<string, number> = {
    'Quietus': 242,
    'Calpurnicus`': 225,
    'Regulus`': 200,
    'Trajan`s': 221,
    'Saturninus': 216,
    'Galerius`': 208,
    'Taurus`': 213,
    'Marinus`': 204,
    'Crispinus`': 198,
    'Zenobius`': 197,
    'Secundus`': 202,
    'Flavius`': 211,
    'Astarius`': 231,
    "Melior's": 240,
    'Cassius`': 191,
    'Aquilius': 243,
    // Learned from mercenary contracts (their hidden prefix id)
    'Acilius`': 235,
  };
  for (const [name, id] of Object.entries(fixedFromReports)) {
    assert.equal(prefixes.find((prefix) => prefix.name === name)?.id, id, name);
  }
  assert.deepEqual(placeholderAffixes(suffixes), []);
});
