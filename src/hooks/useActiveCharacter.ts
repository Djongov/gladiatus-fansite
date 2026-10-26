import { useCallback, useEffect, useState } from 'react';
import {
  encodeCharacterState,
  type BaseStats,
  type EquippedItem,
  type ItemSlotType,
  type CharacterIdentity,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import type { PactId } from '@site/src/components/CharacterPlanner/PactDefinitions';
import { fetchCharacterProfile, type ImportDetails } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import type {
  DollStats,
  ImportedDoll,
  ImportedTurma,
  MissingDataEntry,
  StoredDoll,
  StoredTurma,
} from '@site/src/components/CharacterPlanner/turmaTypes';

const STORAGE_KEY = 'gladiatus.activeCharacter';
const SCHEMA_VERSION = 1 as const;

export type ActiveCharacterRecord = {
  v: typeof SCHEMA_VERSION;
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

export type UseActiveCharacter = {
  character: ActiveCharacterRecord | null;
  login(
    level: number,
    baseStats: BaseStats,
    items: Map<ItemSlotType, EquippedItem>,
    identity: CharacterIdentity,
    pacts?: Set<PactId>,
    profileUrl?: string,
    /** Stats, Turma and missing ids from the import. Without a Turma, the previously stored one is kept. */
    details?: ImportDetails,
  ): void;
  /** Re-fetches the character from its saved profile URL. Rejects on failure, leaving the stored character untouched. */
  refresh(): Promise<void>;
  logout(): void;
};

function readRecord(): ActiveCharacterRecord | null {
  if (typeof globalThis === 'undefined' || !globalThis.localStorage) return null;
  const raw = globalThis.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ActiveCharacterRecord>;
    if (parsed?.v !== SCHEMA_VERSION) {
      console.warn(`[useActiveCharacter] schema version mismatch (got ${String(parsed?.v)}, expected ${SCHEMA_VERSION}); ignoring stored character.`);
      return null;
    }
    if (!parsed.encoded || !parsed.identity || typeof parsed.level !== 'number') {
      console.warn('[useActiveCharacter] stored record is missing required fields; ignoring.');
      return null;
    }
    return parsed as ActiveCharacterRecord;
  } catch (err) {
    console.warn('[useActiveCharacter] failed to parse stored record:', err);
    return null;
  }
}

function toStoredDoll(doll: ImportedDoll): StoredDoll {
  if (doll.status !== 'ok') return doll;
  const { level, baseStats, identity, items, role, stats, contract } = doll;
  return {
    status: 'ok',
    // Same compact format as ?s= share links, decoded with decodeCharacterState
    encoded: encodeCharacterState(level, baseStats, identity, items, new Set()),
    identity,
    level,
    role,
    stats,
    contract,
  };
}

function toStoredTurma(turma: ImportedTurma): StoredTurma {
  return {
    profile: toStoredDoll(turma.profile),
    mercenaries: turma.mercenaries.map(toStoredDoll),
  };
}

export function useActiveCharacter(): UseActiveCharacter {
  const [character, setCharacter] = useState<ActiveCharacterRecord | null>(null);

  useEffect(() => {
    setCharacter(readRecord());
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setCharacter(readRecord());
    }
    globalThis.addEventListener('storage', onStorage);
    return () => globalThis.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback<UseActiveCharacter['login']>((level, baseStats, items, identity, pacts, profileUrl, details) => {
    if (typeof globalThis === 'undefined' || !globalThis.localStorage) {
      console.warn('[useActiveCharacter] localStorage unavailable; cannot persist.');
      return;
    }
    const encoded = encodeCharacterState(level, baseStats, identity, items, pacts ?? new Set());
    // An importer without Turma support leaves stats/turma undefined: keep what this same character had,
    // but never carry one character's Turma over onto a different one
    const previous = readRecord();
    const carriedOver = previous?.profileUrl !== undefined && previous.profileUrl === profileUrl ? previous : null;
    const record: ActiveCharacterRecord = {
      v: SCHEMA_VERSION,
      encoded,
      identity,
      level,
      savedAt: Date.now(),
      profileUrl,
      stats: details?.stats ?? carriedOver?.stats,
      turma: details?.turma ? toStoredTurma(details.turma) : carriedOver?.turma,
      missingData: details?.missingData,
    };
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    setCharacter(record);
  }, []);

  const refresh = useCallback(async () => {
    const profileUrl = character?.profileUrl;
    if (!profileUrl) {
      throw new Error('This character has no saved profile URL. Log out and import it again to enable refresh.');
    }
    const profile = await fetchCharacterProfile(profileUrl);
    login(profile.level, profile.baseStats, profile.items, profile.identity, profile.pacts, profileUrl, profile);
  }, [character?.profileUrl, login]);

  const logout = useCallback(() => {
    if (typeof globalThis === 'undefined' || !globalThis.localStorage) return;
    globalThis.localStorage.removeItem(STORAGE_KEY);
    setCharacter(null);
  }, []);

  return { character, login, refresh, logout };
}
