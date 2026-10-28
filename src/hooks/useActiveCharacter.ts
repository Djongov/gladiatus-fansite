import { useCallback, useSyncExternalStore } from 'react';
import {
  encodeCharacterState,
  type BaseStats,
  type EquippedItem,
  type ItemSlotType,
  type CharacterIdentity,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import type { PactId } from '@site/src/components/CharacterPlanner/PactDefinitions';
import { fetchCharacterProfile, type ImportDetails } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import type { ImportedDoll, ImportedTurma, StoredDoll, StoredTurma } from '@site/src/components/CharacterPlanner/turmaTypes';
import {
  ACTIVE_CHARACTER_SCHEMA_VERSION,
  clearActiveCharacter,
  getActiveCharacter,
  saveActiveCharacter,
  subscribeActiveCharacter,
  type ActiveCharacterRecord,
} from './activeCharacterStore';

export type { ActiveCharacterRecord } from './activeCharacterStore';

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
  // One shared character for every component: a login or logout anywhere reaches the navbar too.
  // The server render (and hydration) sees no character
  const character = useSyncExternalStore(subscribeActiveCharacter, getActiveCharacter, () => null);

  const login = useCallback<UseActiveCharacter['login']>((level, baseStats, items, identity, pacts, profileUrl, details) => {
    const encoded = encodeCharacterState(level, baseStats, identity, items, pacts ?? new Set());
    // An importer without Turma support leaves stats/turma undefined: keep what this same character had,
    // but never carry one character's Turma over onto a different one
    const previous = getActiveCharacter();
    const carriedOver = previous?.profileUrl !== undefined && previous.profileUrl === profileUrl ? previous : null;
    const record: ActiveCharacterRecord = {
      v: ACTIVE_CHARACTER_SCHEMA_VERSION,
      encoded,
      identity,
      level,
      savedAt: Date.now(),
      profileUrl,
      stats: details?.stats ?? carriedOver?.stats,
      turma: details?.turma ? toStoredTurma(details.turma) : carriedOver?.turma,
      missingData: details?.missingData,
    };
    if (!saveActiveCharacter(record)) console.warn('[useActiveCharacter] localStorage unavailable; cannot persist.');
  }, []);

  const refresh = useCallback(async () => {
    const profileUrl = character?.profileUrl;
    if (!profileUrl) {
      throw new Error('This character has no saved profile URL. Log out and import it again to enable refresh.');
    }
    const profile = await fetchCharacterProfile(profileUrl);
    login(profile.level, profile.baseStats, profile.items, profile.identity, profile.pacts, profileUrl, profile);
  }, [character?.profileUrl, login]);

  const logout = useCallback(clearActiveCharacter, []);

  return { character, login, refresh, logout };
}
