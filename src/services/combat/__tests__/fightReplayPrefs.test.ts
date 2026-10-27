import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_REPLAY_PREFS, readReplayPrefs, writeReplayPrefs } from '@site/src/components/FightReplay/fightReplayPrefs';

const KEY = 'gladiatus.fightReplay';

/** Puts a Map-backed localStorage on globalThis (or none), runs the test, and restores it. */
function withStorage(storage: Partial<Storage> | undefined, run: () => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
  try {
    run();
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
}

function mapStorage(initial: Record<string, string> = {}): Partial<Storage> {
  const map = new Map(Object.entries(initial));
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => void map.set(key, value) };
}

test('by default the fight plays by itself at 1×', () => {
  assert.deepEqual(DEFAULT_REPLAY_PREFS, { speed: 1, autoPlay: true });
});

test('without storage: defaults, and saving does nothing', () => {
  withStorage(undefined, () => {
    assert.deepEqual(readReplayPrefs(), DEFAULT_REPLAY_PREFS);
    assert.doesNotThrow(() => writeReplayPrefs({ speed: 2, autoPlay: true }));
  });
});

test('storage that throws: defaults, and saving does nothing', () => {
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  withStorage(broken, () => {
    assert.deepEqual(readReplayPrefs(), DEFAULT_REPLAY_PREFS);
    assert.doesNotThrow(() => writeReplayPrefs({ speed: 2, autoPlay: true }));
  });
});

test('junk falls back field by field', () => {
  withStorage(mapStorage({ [KEY]: '{not json' }), () => assert.deepEqual(readReplayPrefs(), DEFAULT_REPLAY_PREFS));
  withStorage(mapStorage({ [KEY]: JSON.stringify({ speed: 3, autoPlay: true }) }), () =>
    assert.deepEqual(readReplayPrefs(), { speed: 1, autoPlay: true }));
  withStorage(mapStorage({ [KEY]: JSON.stringify({ speed: 4, autoPlay: 'yes' }) }), () =>
    assert.deepEqual(readReplayPrefs(), { speed: 4, autoPlay: true }));
});

test('turning auto-play off is remembered', () => {
  withStorage(mapStorage(), () => {
    writeReplayPrefs({ speed: 1, autoPlay: false });
    assert.deepEqual(readReplayPrefs(), { speed: 1, autoPlay: false });
  });
});

test('saved prefs come back', () => {
  withStorage(mapStorage(), () => {
    writeReplayPrefs({ speed: 4, autoPlay: true });
    assert.deepEqual(readReplayPrefs(), { speed: 4, autoPlay: true });
  });
});
