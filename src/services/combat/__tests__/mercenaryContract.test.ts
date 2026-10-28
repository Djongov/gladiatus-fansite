import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMercenaryContract } from '@site/src/utils/mercenaryContract';
import type { MercenaryRarity } from '@site/src/utils/mercenaryContract';
import type { PrefixSuffix } from '@site/src/components/Item';
import prefixes from '@site/static/data/items/prefixes.json';
import suffixes from '@site/static/data/items/suffixes.json';
import contracts from '@site/sample/mercenary-contracts.json';

const prefixById = (id: number) => (prefixes as PrefixSuffix[]).find((prefix) => prefix.id === id);
const suffixById = (id: number) => (suffixes as PrefixSuffix[]).find((suffix) => suffix.id === id);

// Our affix data is still wrong for these; see "Open Questions" on the Missing Data page
const KNOWN_AFFIX_DATA_ERRORS = [
  { prefixId: 242, suffixId: 330, reason: 'Quietus or of Heroism: Intelligence 1 low' },
  { prefixId: 212, suffixId: 329, reason: "Claudius` + of Hazard: levels sum 10 too high" },
];

const isKnownError = (contract: (typeof contracts)[number]) =>
  KNOWN_AFFIX_DATA_ERRORS.some((error) => error.prefixId === contract.prefixId && error.suffixId === contract.suffixId);

test('every sampled contract is reproduced exactly', () => {
  const checked = contracts.filter((contract) => !isKnownError(contract));
  assert.equal(checked.length, contracts.length - KNOWN_AFFIX_DATA_ERRORS.length);

  for (const contract of checked) {
    const calculated = calculateMercenaryContract({
      typeNumber: contract.type,
      prefix: prefixById(contract.prefixId),
      suffix: suffixById(contract.suffixId),
      rarity: contract.rarity as MercenaryRarity,
    });
    const { source, type, rarity, prefixId, suffixId, ...shown } = contract;
    const { name, ...actual } = calculated;
    assert.deepEqual(actual, shown, `${source}: type ${type} ${rarity}, prefix ${prefixId}, suffix ${suffixId}`);
  }
});

test('life floors the float product: 25 × 112 × 1.15 gives 3219, not 3220', () => {
  const eagleWing = calculateMercenaryContract({ typeNumber: 11, prefix: prefixById(95), suffix: suffixById(229), rarity: 'blue' });
  assert.equal(eagleWing.lifePoints, 8619);
});

test('a contract without a prefix is level suffix + 1', () => {
  const medicus = calculateMercenaryContract({ typeNumber: 2, suffix: suffixById(111), rarity: 'green' });
  assert.deepEqual(medicus, {
    name: 'Medicus', level: 11, lifePoints: 530,
    strength: 15, dexterity: 15, agility: 15, constitution: 17, charisma: 17, intelligence: 35,
  });
});

test('the calculator default, Belisarius Samnit of Merit, matches the auction contract', () => {
  const samnit = calculateMercenaryContract({ typeNumber: 5, prefix: prefixById(148), suffix: suffixById(154), rarity: 'green' });
  assert.deepEqual(samnit, {
    name: 'Samnit', level: 120, lifePoints: 6495,
    strength: 273, dexterity: 364, agility: 232, constitution: 193, charisma: 151, intelligence: 184,
  });
});
