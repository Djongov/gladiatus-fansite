import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearActiveCharacter,
  getActiveCharacter,
  saveActiveCharacter,
  subscribeActiveCharacter,
  type ActiveCharacterRecord,
} from '@site/src/hooks/activeCharacterStore';

const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => { storage.set(key, value); },
  removeItem: (key: string) => { storage.delete(key); },
};
(globalThis as any).addEventListener ??= () => {};
(globalThis as any).removeEventListener ??= () => {};

const record = (name: string): ActiveCharacterRecord => ({
  v: 1,
  encoded: 'x',
  identity: { name, title: undefined, gender: 'male' },
  level: 100,
  savedAt: 0,
});

beforeEach(() => storage.clear());

test('a logout reaches every subscriber, not only the one that logged out', () => {
  saveActiveCharacter(record('Skarsburning'));
  let navbarSees = getActiveCharacter()?.identity.name;
  const unsubscribe = subscribeActiveCharacter(() => { navbarSees = getActiveCharacter()?.identity.name; });

  clearActiveCharacter();

  assert.equal(navbarSees, undefined);
  unsubscribe();
});

test('a new import replaces the previous character for every subscriber', () => {
  saveActiveCharacter(record('First'));
  let navbarSees = getActiveCharacter()?.identity.name;
  const unsubscribe = subscribeActiveCharacter(() => { navbarSees = getActiveCharacter()?.identity.name; });

  saveActiveCharacter(record('Second'));

  assert.equal(navbarSees, 'Second');
  unsubscribe();
});

test('the same stored character is the same object between reads, so React does not re-render in a loop', () => {
  saveActiveCharacter(record('Stable'));
  assert.equal(getActiveCharacter(), getActiveCharacter());
});

test('nothing stored, or a record from another schema version, reads as logged out', () => {
  assert.equal(getActiveCharacter(), null);
  storage.set('gladiatus.activeCharacter', JSON.stringify({ ...record('Old'), v: 0 }));
  assert.equal(getActiveCharacter(), null);
});
