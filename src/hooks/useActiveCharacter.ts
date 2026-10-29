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
import { calculateDollStats } from '@site/src/components/CharacterPlanner/dollStats';
import { contractAsImported, memberDoll } from '@site/src/components/CharacterPlanner/useTeamState';
import type { MercenaryMember, TeamMember, TeamState } from '@site/src/components/CharacterPlanner/useTeamState';
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
  /** Replaces the stored character with a Character Planner build (character and Turma team), keeping the profile URL */
  importBuild(build: PlannedBuild): void;
  logout(): void;
};

/** A Character Planner build, as Import this build receives it. */
export type PlannedBuild = {
  level: number;
  baseStats: BaseStats;
  identity: CharacterIdentity;
  items: Map<ItemSlotType, EquippedItem>;
  pacts: Set<PactId>;
  /** False only while section 1 is exactly the logged-in character */
  characterEdited: boolean;
  team: TeamState;
};

function plannedDoll(member: TeamMember | MercenaryMember, kind: 'turmaProfile' | 'mercenary', build: PlannedBuild): StoredDoll {
  // Untouched imports keep the game's own numbers
  if (!member.edited && member.stored) return member.stored;
  // The Turma profile is the character itself: section 2 always shows it, so unless it's locked it is imported
  const shown = member.status === 'ok' || (kind === 'turmaProfile' && member.status === 'empty');
  const doll = shown ? memberDoll(member, kind, build) : null;
  if (!doll) return { status: member.status === 'locked' ? 'locked' : 'empty' };

  const contract = doll.contract;
  const name = member.stored?.identity.name ?? (kind === 'turmaProfile' ? build.identity.name : contract?.name ?? 'Mercenary');
  const identity: CharacterIdentity = { ...(member.stored?.identity ?? { gender: build.identity.gender }), name };
  // An unchanged imported contract is written back as imported; a planned one is rebuilt
  const planned = 'contract' in member && !contractAsImported(member) ? member.contract : null;
  return {
    status: 'ok',
    encoded: encodeCharacterState(doll.level, doll.baseStats, identity, member.items, new Set()),
    identity,
    level: doll.level,
    role: member.role,
    stats: doll.stats,
    contract: contract && planned ? {
      name: contract.name,
      rarity: planned.rarity,
      level: contract.level,
      lifePoints: contract.lifePoints,
      strength: contract.strength,
      dexterity: contract.dexterity,
      agility: contract.agility,
      constitution: contract.constitution,
      charisma: contract.charisma,
      intelligence: contract.intelligence,
      baseItemId: `15-${planned.typeNumber}`,
      prefixId: planned.prefixId,
      suffixId: planned.suffixId,
    } : member.stored?.contract,
  };
}

/** The stored character a planned build becomes. Keeps the previous profile URL so /character can refresh back. */
export function plannedRecord({ previous, ...build }: PlannedBuild & { previous: ActiveCharacterRecord | null }): ActiveCharacterRecord {
  const { level, baseStats, identity, items, pacts, characterEdited, team } = build;
  const keepGameStats = !characterEdited && previous?.stats;
  return {
    v: ACTIVE_CHARACTER_SCHEMA_VERSION,
    encoded: encodeCharacterState(level, baseStats, identity, items, pacts),
    identity,
    level,
    savedAt: Date.now(),
    profileUrl: previous?.profileUrl,
    stats: keepGameStats ? previous.stats : calculateDollStats({ kind: 'character', level, baseStats, items, pacts }),
    turma: {
      profile: plannedDoll(team.turmaProfile, 'turmaProfile', build),
      mercenaries: team.mercenaries.map((member) => plannedDoll(member, 'mercenary', build)),
    },
  };
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

export function toStoredTurma(turma: ImportedTurma): StoredTurma {
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

  const importBuild = useCallback<UseActiveCharacter['importBuild']>((build) => {
    const record = plannedRecord({ ...build, previous: getActiveCharacter() });
    if (!saveActiveCharacter(record)) console.warn('[useActiveCharacter] localStorage unavailable; cannot persist.');
  }, []);

  const logout = useCallback(clearActiveCharacter, []);

  return { character, login, refresh, importBuild, logout };
}
