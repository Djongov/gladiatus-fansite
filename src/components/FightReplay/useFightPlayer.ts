/**
 * The replay's clock: a position through the timeline's beats (-1 = the ready frame,
 * beatCount = the quiet end frame), advanced on timers at the chosen speed.
 */
import { useCallback, useEffect, useReducer, useState } from 'react';
import { delayBefore, type FightTimeline } from './fightTimeline';
import { readReplayPrefs, writeReplayPrefs, type FightReplayPrefs, type ReplaySpeed } from './fightReplayPrefs';

export type PlayerStatus = 'ready' | 'playing' | 'paused' | 'finished';
export type PlayerState = { pos: number; status: PlayerStatus; beatCount: number };
export type PlayerAction =
  | { type: 'load'; beatCount: number; startFinished: boolean }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'replay' }
  | { type: 'skipToEnd' }
  | { type: 'advance' };

const finished = (beatCount: number): PlayerState => ({ pos: beatCount, status: 'finished', beatCount });

export function fightPlayerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'load':
      return action.startFinished || action.beatCount === 0
        ? finished(action.beatCount)
        : { pos: -1, status: 'ready', beatCount: action.beatCount };
    case 'play':
      if (state.status === 'finished') return { ...state, pos: -1, status: 'playing' };
      return { ...state, status: 'playing' };
    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state;
    case 'replay':
      return { ...state, pos: -1, status: 'playing' };
    case 'skipToEnd':
      return finished(state.beatCount);
    case 'advance':
      if (state.status !== 'playing') return state;
      return state.pos + 1 >= state.beatCount ? finished(state.beatCount) : { ...state, pos: state.pos + 1 };
  }
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function useFightPlayer(timeline: FightTimeline) {
  const [prefs, setPrefs] = useState<FightReplayPrefs>(readReplayPrefs);
  const [reducedMotion] = useState(prefersReducedMotion);
  const [state, dispatch] = useReducer(fightPlayerReducer, undefined, () =>
    fightPlayerReducer(finished(0), { type: 'load', beatCount: timeline.beats.length, startFinished: reducedMotion }));

  // A new fight (another report) resets in the same render, so no frame shows a stale position
  const [loadedTimeline, setLoadedTimeline] = useState(timeline);
  if (loadedTimeline !== timeline) {
    setLoadedTimeline(timeline);
    dispatch({ type: 'load', beatCount: timeline.beats.length, startFinished: reducedMotion });
  }

  useEffect(() => {
    if (prefs.autoPlay && !reducedMotion) dispatch({ type: 'play' });
    // Prefs are read when a fight loads; changing them later doesn't restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, reducedMotion]);

  useEffect(() => {
    if (state.status !== 'playing') return undefined;
    const timer = setTimeout(() => dispatch({ type: 'advance' }), delayBefore(timeline.beats, state.pos + 1) / prefs.speed);
    return () => clearTimeout(timer);
  }, [state.status, state.pos, prefs.speed, timeline]);

  const savePrefs = useCallback((change: Partial<FightReplayPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...change };
      writeReplayPrefs(next);
      return next;
    });
  }, []);

  return {
    pos: state.pos,
    status: state.status,
    speed: prefs.speed,
    autoPlay: prefs.autoPlay,
    reducedMotion,
    play: useCallback(() => dispatch({ type: 'play' }), []),
    pause: useCallback(() => dispatch({ type: 'pause' }), []),
    replay: useCallback(() => dispatch({ type: 'replay' }), []),
    skipToEnd: useCallback(() => dispatch({ type: 'skipToEnd' }), []),
    setSpeed: useCallback((speed: ReplaySpeed) => savePrefs({ speed }), [savePrefs]),
    setAutoPlay: useCallback((autoPlay: boolean) => savePrefs({ autoPlay }), [savePrefs]),
  };
}
