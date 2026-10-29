import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fightPlayerReducer, type PlayerState } from '@site/src/components/FightReplay/useFightPlayer';

const state = (pos: number, status: PlayerState['status'], beatCount = 3): PlayerState => ({ pos, status, beatCount });

test('a loaded fight waits on its first frame, or opens on the end frame', () => {
  assert.deepEqual(fightPlayerReducer(state(7, 'playing', 9), { type: 'load', beatCount: 3, startFinished: false }), state(-1, 'ready'));
  assert.deepEqual(fightPlayerReducer(state(-1, 'ready'), { type: 'load', beatCount: 3, startFinished: true }), state(3, 'finished'));
});

test('a fight without beats loads finished', () => {
  assert.deepEqual(fightPlayerReducer(state(-1, 'ready'), { type: 'load', beatCount: 0, startFinished: false }), state(0, 'finished', 0));
});

test('play, pause and play again keep the position', () => {
  const playing = fightPlayerReducer(state(-1, 'ready'), { type: 'play' });
  assert.deepEqual(playing, state(-1, 'playing'));
  const paused = fightPlayerReducer({ ...playing, pos: 1 }, { type: 'pause' });
  assert.deepEqual(paused, state(1, 'paused'));
  assert.deepEqual(fightPlayerReducer(paused, { type: 'play' }), state(1, 'playing'));
});

test('play on the end frame starts over', () => {
  assert.deepEqual(fightPlayerReducer(state(3, 'finished'), { type: 'play' }), state(-1, 'playing'));
});

test('advance steps through the beats and finishes past the last', () => {
  assert.deepEqual(fightPlayerReducer(state(-1, 'playing'), { type: 'advance' }), state(0, 'playing'));
  assert.deepEqual(fightPlayerReducer(state(2, 'playing'), { type: 'advance' }), state(3, 'finished'));
});

test('advance does nothing unless playing', () => {
  assert.deepEqual(fightPlayerReducer(state(1, 'paused'), { type: 'advance' }), state(1, 'paused'));
});

test('replay starts over and plays; skip goes to the quiet end frame', () => {
  assert.deepEqual(fightPlayerReducer(state(2, 'paused'), { type: 'replay' }), state(-1, 'playing'));
  assert.deepEqual(fightPlayerReducer(state(0, 'playing'), { type: 'skipToEnd' }), state(3, 'finished'));
});
