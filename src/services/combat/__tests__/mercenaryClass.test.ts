import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mercenaryClassFromContract } from '@site/src/utils/mercenaryPortrait';

// Each vendor country sells contracts 15-1..5, 15-6..10, ...: one tank, one healer, three damage dealers
test('the contract decides the mercenary class', () => {
  assert.equal(mercenaryClassFromContract('15-16'), 'tank'); // Grandmaster
  assert.equal(mercenaryClassFromContract('15-1'), 'tank');
  assert.equal(mercenaryClassFromContract('15-17'), 'healer');
  assert.equal(mercenaryClassFromContract('15-7'), 'healer');
  assert.equal(mercenaryClassFromContract('15-5'), 'damage'); // Samnit
  assert.equal(mercenaryClassFromContract('15-19'), 'damage');
});

test('no contract, no class', () => {
  assert.equal(mercenaryClassFromContract(undefined), null);
  assert.equal(mercenaryClassFromContract('15-x'), null);
});
