/**
 * The logged-in ("active") character, shared by every component in the tab. localStorage keeps it
 * between visits; this store tells every subscriber when it changes, because the browser's
 * `storage` event only reaches other tabs.
 */
import type { CharacterIdentity } from '@site/src/components/CharacterPlanner/useCharacterState';
import type { DollStats, MissingDataEntry, StoredTurma } from '@site/src/components/CharacterPlanner/turmaTypes';

const STORAGE_KEY = 'gladiatus.activeCharacter';
export const ACTIVE_CHARACTER_SCHEMA_VERSION = 1 as const;

export type ActiveCharacterRecord = {
  v: typeof ACTIVE_CHARACTER_SCHEMA_VERSION;
  encoded: string;
  identity: CharacterIdentity;
  level: number;
  savedAt: number;
  /** Absent on records saved before refresh support; such characters can't be refreshed. */
  profileUrl?: string;
  /** Absent on records saved before Circus Turma support; filled on the next refresh. */
  stats?: DollStats;
  turma?: StoredTurma;
  /** Ids on the player's gear our item data lacks; replaced on every import. Absent on older records. */
  missingData?: MissingDataEntry[];
};

const listeners = new Set<() => void>();

// Parsed once per stored string, so repeated reads return the same object
let cachedRaw: string | null = null;
let cachedRecord: ActiveCharacterRecord | null = null;

const storage = (): Storage | null => globalThis.localStorage ?? null;

function parseRecord(raw: string): ActiveCharacterRecord | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveCharacterRecord>;
    if (parsed?.v !== ACTIVE_CHARACTER_SCHEMA_VERSION) {
      console.warn(`[activeCharacterStore] schema version mismatch (got ${String(parsed?.v)}, expected ${ACTIVE_CHARACTER_SCHEMA_VERSION}); ignoring stored character.`);
      return null;
    }
    if (!parsed.encoded || !parsed.identity || typeof parsed.level !== 'number') {
      console.warn('[activeCharacterStore] stored record is missing required fields; ignoring.');
      return null;
    }
    return parsed as ActiveCharacterRecord;
  } catch (err) {
    console.warn('[activeCharacterStore] failed to parse stored record:', err);
    return null;
  }
}

export function getActiveCharacter(): ActiveCharacterRecord | null {
  const raw = storage()?.getItem(STORAGE_KEY) ?? null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRecord = raw ? parseRecord(raw) : null;
  }
  return cachedRecord;
}

function notify() {
  for (const listener of listeners) listener();
}

/** Returns false when localStorage is unavailable. */
export function saveActiveCharacter(record: ActiveCharacterRecord): boolean {
  const store = storage();
  if (!store) return false;
  store.setItem(STORAGE_KEY, JSON.stringify(record));
  notify();
  return true;
}

export function clearActiveCharacter(): void {
  storage()?.removeItem(STORAGE_KEY);
  notify();
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === null) notify();
}

export function subscribeActiveCharacter(listener: () => void): () => void {
  if (listeners.size === 0) globalThis.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) globalThis.removeEventListener('storage', onStorage);
  };
}
