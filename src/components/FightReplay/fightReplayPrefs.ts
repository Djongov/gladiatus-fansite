/**
 * The fight replay's speed and auto-play, remembered in this browser. Storage can be
 * missing or refuse access (private windows), so every read and write falls back quietly.
 */

export type ReplaySpeed = 1 | 2 | 4;
export const REPLAY_SPEEDS: ReplaySpeed[] = [1, 2, 4];

export type FightReplayPrefs = { speed: ReplaySpeed; autoPlay: boolean };
/** A fight plays by itself at 1× until the visitor changes either */
export const DEFAULT_REPLAY_PREFS: FightReplayPrefs = { speed: 1, autoPlay: true };

const STORAGE_KEY = 'gladiatus.fightReplay';

const isReplaySpeed = (value: unknown): value is ReplaySpeed => REPLAY_SPEEDS.includes(value as ReplaySpeed);

export function readReplayPrefs(): FightReplayPrefs {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REPLAY_PREFS;
    const saved = JSON.parse(raw) as Partial<Record<keyof FightReplayPrefs, unknown>>;
    return {
      speed: isReplaySpeed(saved.speed) ? saved.speed : DEFAULT_REPLAY_PREFS.speed,
      autoPlay: typeof saved.autoPlay === 'boolean' ? saved.autoPlay : DEFAULT_REPLAY_PREFS.autoPlay,
    };
  } catch {
    return DEFAULT_REPLAY_PREFS;
  }
}

export function writeReplayPrefs(prefs: FightReplayPrefs): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Not remembered this time; the replay still works
  }
}
