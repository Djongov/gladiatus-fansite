import { useReducer } from 'react';
import type { Dispatch } from 'react';
import {
  compressForUrl,
  decodeCharacterState,
  decompressFromUrl,
  deserializeEquippedItem,
  serializeEquippedItem,
} from './useCharacterState';
import type { BaseStats, EquippedItem, ItemSlotType } from './useCharacterState';
import type { DollStats, StoredDoll, StoredTurma } from './turmaTypes';
import type { PactId } from './PactDefinitions';
import { calculateDollStats } from './dollStats';
import type { PrefixSuffix } from '../Item';
import { calculateMercenaryContract } from '@site/src/utils/mercenaryContract';
import type { CalculatedContract, MercenaryRarity } from '@site/src/utils/mercenaryContract';
import { tacticFromRole } from '@site/src/services/combat/turmaRules';
import type { Tactic } from '@site/src/services/combat/teamTypes';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';

/** The game's own tactic texts; the simulators read these (tacticFromRole). */
export type Role = 'Direct attention to oneself' | 'Heal group members' | 'Dish out damage';

export const ROLE_BY_TACTIC: Record<Tactic, Role> = {
  tank: 'Direct attention to oneself',
  healer: 'Heal group members',
  damage: 'Dish out damage',
};

export type PlannedContract = { typeNumber: number; prefixId?: number; suffixId?: number; rarity: MercenaryRarity };

export type TeamMember = {
  /** As imported; filling an empty or locked member makes it 'ok' */
  status: 'ok' | 'empty' | 'locked';
  items: Map<ItemSlotType, EquippedItem>;
  role: Role | null;
  /** False while the member is exactly as imported, so Import this build can write the game's own numbers back */
  edited: boolean;
  /** The imported doll, for writing an unedited member back unchanged */
  stored?: Extract<StoredDoll, { status: 'ok' }>;
};

export type MercenaryMember = TeamMember & { contract: PlannedContract | null };

export type TeamState = {
  turmaProfile: TeamMember;
  mercenaries: [MercenaryMember, MercenaryMember, MercenaryMember, MercenaryMember];
};

export type MemberRef = 'turmaProfile' | 0 | 1 | 2 | 3;

export type TeamAction =
  | { type: 'setItem'; member: MemberRef; slot: ItemSlotType; item: EquippedItem | null }
  | { type: 'setRole'; member: MemberRef; role: Role }
  | { type: 'setContract'; mercenary: 0 | 1 | 2 | 3; contract: PlannedContract | null }
  /** Section 1's base stats, level or pacts changed: the Turma profile shares them */
  | { type: 'characterChanged' }
  | { type: 'load'; state: TeamState };

const emptyMember = (): TeamMember => ({ status: 'empty', items: new Map(), role: null, edited: false });
const emptyMercenary = (): MercenaryMember => ({ ...emptyMember(), contract: null });

export const EMPTY_TEAM: TeamState = {
  turmaProfile: emptyMember(),
  mercenaries: [emptyMercenary(), emptyMercenary(), emptyMercenary(), emptyMercenary()],
};

function updateMember(state: TeamState, ref: MemberRef, change: (member: MercenaryMember) => MercenaryMember): TeamState {
  if (ref === 'turmaProfile') {
    const { contract: _unused, ...turmaProfile } = change({ ...state.turmaProfile, contract: null });
    return { ...state, turmaProfile };
  }
  const mercenaries = [...state.mercenaries] as TeamState['mercenaries'];
  mercenaries[ref] = change(mercenaries[ref]);
  return { ...state, mercenaries };
}

/** An edit fills an empty or locked member and marks it edited. */
const edited = (member: MercenaryMember): MercenaryMember => ({ ...member, status: 'ok', edited: true });

export function teamReducer(state: TeamState, action: TeamAction): TeamState {
  switch (action.type) {
    case 'setItem':
      return updateMember(state, action.member, (member) => {
        const items = new Map(member.items);
        if (action.item) items.set(action.slot, action.item);
        else items.delete(action.slot);
        return edited({ ...member, items });
      });
    case 'setRole':
      return updateMember(state, action.member, (member) => edited({ ...member, role: action.role }));
    case 'setContract':
      return updateMember(state, action.mercenary, (member) => edited({ ...member, contract: action.contract }));
    case 'characterChanged':
      return state.turmaProfile.edited ? state : { ...state, turmaProfile: { ...state.turmaProfile, edited: true } };
    case 'load':
      return action.state;
  }
}

function memberFromStored(doll: StoredDoll | undefined): TeamMember {
  // A slot that failed to load is planned like an empty one
  if (doll?.status !== 'ok') return { ...emptyMember(), status: doll?.status === 'locked' ? 'locked' : 'empty' };
  const decoded = decodeCharacterState(doll.encoded, doll.identity.name);
  return {
    status: 'ok',
    items: decoded?.items ?? new Map(),
    // Unknown texts (other languages) count as damage, exactly as the simulators read them
    role: ROLE_BY_TACTIC[tacticFromRole(doll.role)],
    edited: false,
    stored: doll,
  };
}

function contractFromStored(doll: StoredDoll | undefined): PlannedContract | null {
  if (doll?.status !== 'ok' || !doll.contract) return null;
  const typeNumber = Number(doll.contract.baseItemId.split('-')[1]);
  return {
    typeNumber,
    prefixId: doll.contract.prefixId,
    suffixId: doll.contract.suffixId,
    rarity: doll.contract.rarity as MercenaryRarity,
  };
}

/** The imported Turma as planner team members, none of them edited yet. */
export function teamFromStored(turma: StoredTurma | undefined): TeamState {
  if (!turma) return EMPTY_TEAM;
  const mercenary = (index: number): MercenaryMember => ({
    ...memberFromStored(turma.mercenaries[index]),
    contract: contractFromStored(turma.mercenaries[index]),
  });
  return {
    turmaProfile: memberFromStored(turma.profile),
    mercenaries: [mercenary(0), mercenary(1), mercenary(2), mercenary(3)],
  };
}

const prefixes = prefixesData as PrefixSuffix[];
const suffixes = suffixesData as PrefixSuffix[];

/** What a mercenary's contract makes it: level, base stats and the contract itself. Null without a contract. */
export function mercenaryBuild(member: MercenaryMember): { level: number; baseStats: BaseStats; contract: CalculatedContract } | null {
  if (!member.contract) return null;
  const { typeNumber, prefixId, suffixId, rarity } = member.contract;
  const contract = calculateMercenaryContract({
    typeNumber,
    prefix: prefixes.find((affix) => affix.id === prefixId),
    suffix: suffixes.find((affix) => affix.id === suffixId),
    rarity,
  });
  const { strength, dexterity, agility, constitution, charisma, intelligence } = contract;
  return { level: contract.level, baseStats: { strength, dexterity, agility, constitution, charisma, intelligence }, contract };
}

/** What the Turma profile shares with the character (section 1). */
export type CharacterBasics = { level: number; baseStats: BaseStats; pacts: Set<PactId> };

export type MemberDoll = {
  level: number;
  baseStats: BaseStats;
  pacts: Set<PactId>;
  /** The game's numbers while the member is as imported; calculated from gear once edited */
  stats: DollStats;
  /** Mercenaries: the contract as planned (null when an unedited import has no affix ids to rebuild it from) */
  contract: CalculatedContract | null;
};

const NO_PACTS = new Set<PactId>();

const sameContract = (a: PlannedContract | null, b: PlannedContract | null) =>
  a?.typeNumber === b?.typeNumber && a?.prefixId === b?.prefixId && a?.suffixId === b?.suffixId && a?.rarity === b?.rarity;

/** True while an imported mercenary's contract hasn't been changed in the planner. */
export function contractAsImported(member: MercenaryMember): boolean {
  return !!member.stored && sameContract(member.contract, contractFromStored(member.stored));
}

/** True for an imported contract from before affix ids were kept: it can't be rebuilt, only re-imported. */
export function contractAffixesUnknown(member: MercenaryMember): boolean {
  return contractAsImported(member) && !!member.contract && !member.contract.prefixId && !member.contract.suffixId;
}

/** The imported contract as the planner shows it. Without one, its life is worked back from the imported doll. */
function storedContract(stored: Extract<StoredDoll, { status: 'ok' }>, baseStats: BaseStats): CalculatedContract {
  const imported = stored.contract;
  if (imported?.lifePoints != null) {
    return {
      name: imported.name,
      level: imported.level,
      lifePoints: imported.lifePoints,
      strength: imported.strength ?? baseStats.strength,
      dexterity: imported.dexterity ?? baseStats.dexterity,
      agility: imported.agility ?? baseStats.agility,
      constitution: imported.constitution ?? baseStats.constitution,
      charisma: imported.charisma ?? baseStats.charisma,
      intelligence: imported.intelligence ?? baseStats.intelligence,
    };
  }
  const importedItems = decodeCharacterState(stored.encoded, stored.identity.name)?.items ?? new Map();
  const asImported = calculateDollStats({ kind: 'mercenary', level: stored.level, baseStats, items: importedItems, pacts: NO_PACTS, contractLifePoints: 0 });
  return {
    name: stored.identity.name,
    level: stored.level,
    lifePoints: (stored.stats.lifePoints ?? 0) - (asImported.lifePoints ?? 0),
    ...baseStats,
  };
}

/** Level, base stats and combat numbers for one team member, or null for a mercenary slot without a contract. */
export function memberDoll(member: TeamMember | MercenaryMember, kind: 'turmaProfile' | 'mercenary', character: CharacterBasics): MemberDoll | null {
  const tactic = member.role ? tacticFromRole(member.role) : undefined;
  const asImported = !member.edited && member.stored;

  if (kind === 'turmaProfile') {
    const stats = asImported
      ? member.stored!.stats
      : calculateDollStats({ kind, level: character.level, baseStats: character.baseStats, items: member.items, pacts: character.pacts, tactic });
    return { level: character.level, baseStats: character.baseStats, pacts: character.pacts, stats, contract: null };
  }

  const mercenary = member as MercenaryMember;
  const build = mercenaryBuild(mercenary);
  const stored = mercenary.stored;
  if (stored && contractAsImported(mercenary)) {
    // The contract is as imported: its level and attributes come from the import (older imports have no affix ids
    // to rebuild it from); only gear and role can have changed
    const baseStats = decodeCharacterState(stored.encoded, stored.identity.name)?.baseStats ?? character.baseStats;
    const contract = storedContract(stored, baseStats);
    const stats = asImported ? stored.stats : calculateDollStats({
      kind, level: stored.level, baseStats, items: member.items, pacts: NO_PACTS, tactic, contractLifePoints: contract.lifePoints,
    });
    return { level: stored.level, baseStats, pacts: NO_PACTS, stats, contract };
  }
  if (!build) return null;
  const stats = calculateDollStats({
    kind, level: build.level, baseStats: build.baseStats, items: member.items, pacts: NO_PACTS, tactic,
    contractLifePoints: build.contract.lifePoints,
  });
  return { level: build.level, baseStats: build.baseStats, pacts: NO_PACTS, stats, contract: build.contract };
}

// ─── Share links: the team travels in a second URL param, `t` (the character stays in `s`) ───

const MERCENARY_RARITIES: MercenaryRarity[] = ['green', 'blue', 'purple', 'orange', 'red'];
const TACTICS: Tactic[] = ['tank', 'healer', 'damage'];

type SharedMember = {
  /** Items in the share-link item format */
  i: Record<string, unknown>[];
  /** Index into TACTICS, absent without a role */
  r?: number;
  /** Mercenary contract: [type, prefix id or 0, suffix id or 0, index into MERCENARY_RARITIES] */
  c?: [number, number, number, number];
};
type SharedTeam = { v: 1; t: SharedMember | null; m: (SharedMember | null)[] };

function shareMember(member: MercenaryMember): SharedMember | null {
  if (member.status !== 'ok') return null;
  const shared: SharedMember = {
    i: [...member.items.entries()].map(([slot, item]) => ({ ...serializeEquippedItem(item), s: slot })),
  };
  if (member.role) shared.r = TACTICS.indexOf(tacticFromRole(member.role));
  if (member.contract) {
    const { typeNumber, prefixId, suffixId, rarity } = member.contract;
    shared.c = [typeNumber, prefixId ?? 0, suffixId ?? 0, MERCENARY_RARITIES.indexOf(rarity)];
  }
  return shared;
}

function memberFromShare(shared: SharedMember | null): MercenaryMember {
  if (!shared) return emptyMercenary();
  const items = new Map<ItemSlotType, EquippedItem>();
  for (const compact of shared.i) {
    const item = deserializeEquippedItem(compact);
    if (item) items.set(compact.s as ItemSlotType, item);
  }
  const contract = shared.c && {
    typeNumber: shared.c[0],
    prefixId: shared.c[1] || undefined,
    suffixId: shared.c[2] || undefined,
    rarity: MERCENARY_RARITIES[shared.c[3]] ?? 'green',
  };
  return {
    status: 'ok',
    items,
    role: shared.r === undefined ? null : ROLE_BY_TACTIC[TACTICS[shared.r]],
    // Someone else's plan: nothing here is the reader's imported doll
    edited: true,
    contract: contract ?? null,
  };
}

export function encodeTeamState(team: TeamState): string {
  const shared: SharedTeam = {
    v: 1,
    t: shareMember({ ...team.turmaProfile, contract: null }),
    m: team.mercenaries.map(shareMember),
  };
  return compressForUrl(JSON.stringify(shared));
}

export function decodeTeamState(encoded: string): TeamState | null {
  try {
    const json = decompressFromUrl(encoded);
    if (!json) return null;
    const shared = JSON.parse(json) as SharedTeam;
    if (shared?.v !== 1 || !Array.isArray(shared.m)) return null;
    const { contract: _unused, ...turmaProfile } = memberFromShare(shared.t);
    const mercenary = (index: number) => memberFromShare(shared.m[index] ?? null);
    return { turmaProfile, mercenaries: [mercenary(0), mercenary(1), mercenary(2), mercenary(3)] };
  } catch {
    return null;
  }
}

/** The `t` URL param as a team; links from before team sharing (or broken ones) give an empty team. */
export function teamFromUrlParam(param: string | null): TeamState {
  return (param && decodeTeamState(param)) || EMPTY_TEAM;
}

export function useTeamState(): { team: TeamState; dispatch: Dispatch<TeamAction> } {
  const [team, dispatch] = useReducer(teamReducer, EMPTY_TEAM);
  return { team, dispatch };
}
