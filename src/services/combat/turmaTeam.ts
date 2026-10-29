/**
 * Turns a player's imported (or stored) Circus Turma into team-fight fighters.
 * The game's own numbers are used wherever the doll page gives them; only what
 * it doesn't show (crit/block/resilience/critical healing values) is calculated
 * from the doll's gear.
 */
import type { PactId } from '@site/src/components/CharacterPlanner/PactDefinitions';
import type { DollStats, ImportedDoll, StoredDoll, StoredTurma, ImportedTurma } from '@site/src/components/CharacterPlanner/turmaTypes';
import {
  calculateCharacterStats,
  decodeCharacterState,
  type BaseStats,
  type CharacterIdentity,
  type EquippedItem,
  type ItemSlotType,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import type { ActiveCharacterRecord } from '@site/src/hooks/useActiveCharacter';
import { resolveCharacterPortrait } from '@site/src/utils/characterFaceImage';
import { mercenaryClassFromContract, mercenaryPortraitUrl } from '@site/src/utils/mercenaryPortrait';
import { armourAbsorption } from './chanceFormulas';
import type { TeamFighter, TeamSide } from './teamTypes';
import { tacticFromRole } from './turmaRules';

export type TurmaTeamResult =
  | { status: 'ok'; fighters: TeamFighter[] }
  /** missing: no Turma data; locked: below the Turma level; stale: saved before the full stats; empty: no fighters */
  | { status: 'missing' | 'locked' | 'stale' | 'empty' };

/** Why your own team can't fight, worded for the player (Turma simulator, dungeon Attack buttons). */
export const YOUR_TURMA_PROBLEMS: Record<Exclude<TurmaTeamResult['status'], 'ok'>, string> = {
  missing: 'Refresh your profile on the Character page to load your Circus Turma.',
  stale: 'Refresh your profile on the Character page to load your Circus Turma.',
  locked: 'Circus Turma unlocks at level 10.',
  empty: 'Your Circus Turma has no fighters.',
};

const NO_PACTS: Set<PactId> = new Set();

/** One doll ready to become a fighter: its gear plus the game's stat panel. */
type DollSource = {
  identity: CharacterIdentity;
  level: number;
  role: string | null;
  stats: DollStats;
  items: Map<ItemSlotType, EquippedItem>;
  baseStats: BaseStats;
  contractBaseItemId?: string;
};

type CompleteStats = DollStats & Required<Pick<DollStats, 'attributes'>> & {
  lifePoints: number;
  armour: number;
  damageMin: number;
  damageMax: number;
};

function hasCompleteStats(stats: DollStats): stats is CompleteStats {
  return Boolean(stats.attributes) && stats.lifePoints !== null && stats.armour !== null
    && stats.damageMin !== null && stats.damageMax !== null;
}

function toFighter(
  source: DollSource & { stats: CompleteStats },
  isPlayer: boolean,
  pacts: Set<PactId>,
  profileUrl: string | undefined,
  side: TeamSide,
  index: number,
): TeamFighter {
  const { stats, identity, level } = source;
  const { attributes } = stats;
  const gear = calculateCharacterStats(source.items, level, source.baseStats, pacts);
  const absorb = armourAbsorption(stats.armour);
  const critHealingFromItems = gear.stats.get('Critical healing value')?.flat ?? 0;

  return {
    id: `${side}-${index}`,
    name: identity.name,
    side,
    kind: isPlayer ? 'player' : 'mercenary',
    tactic: tacticFromRole(source.role),
    mercenaryClass: isPlayer ? null : mercenaryClassFromContract(source.contractBaseItemId),
    level,
    image: isPlayer
      ? resolveCharacterPortrait({ costume: identity.costume, level, gender: identity.gender })
      : mercenaryPortraitUrl(profileUrl, source.contractBaseItemId),
    maxLife: stats.lifePoints,
    damageMin: stats.damageMin,
    damageMax: stats.damageMax,
    armour: stats.armour,
    armourAbsorbMin: absorb.min,
    armourAbsorbMax: absorb.max,
    strength: attributes.strength.total,
    dexterity: attributes.dexterity.total,
    agility: attributes.agility.total,
    constitution: attributes.constitution.total,
    charisma: attributes.charisma.total,
    intelligence: attributes.intelligence.total,
    critValue: gear.totalCriticalAttack,
    blockValue: gear.totalBlocking,
    resilience: gear.totalResilience,
    healing: stats.healing ?? 0,
    critHealValue: Math.floor(attributes.intelligence.total / 5) + critHealingFromItems,
    threatStat: stats.threat ?? 0,
    fixedChances: null,
    abilities: [],
    castAbilities: [],
    passiveEffects: [],
  };
}

/**
 * Shared by both entry points: `sources[0]` is the Turma profile, the rest are mercenaries.
 * A null source is a doll whose stored data couldn't be read.
 */
function buildTeam<Doll extends ImportedDoll | StoredDoll>(
  turma: { profile: Doll; mercenaries: Doll[] },
  toSource: (doll: Extract<Doll, { status: 'ok' }>) => DollSource | null,
  playerPacts: Set<PactId>,
  profileUrl: string | undefined,
  side: TeamSide,
): TurmaTeamResult {
  if (turma.profile.status === 'locked') return { status: 'locked' };

  const dolls = [turma.profile, ...turma.mercenaries];
  const fighters: TeamFighter[] = [];
  for (const [dollIndex, doll] of dolls.entries()) {
    if (doll.status !== 'ok') continue;
    const source = toSource(doll as Extract<Doll, { status: 'ok' }>);
    if (!source || !hasCompleteStats(source.stats)) return { status: 'stale' };
    const isPlayer = dollIndex === 0;
    fighters.push(
      toFighter({ ...source, stats: source.stats }, isPlayer, isPlayer ? playerPacts : NO_PACTS, profileUrl, side, fighters.length),
    );
  }
  return fighters.length > 0 ? { status: 'ok', fighters } : { status: 'empty' };
}

/** An opponent fresh from the importer; the Turma profile gets the player's pacts. */
export function turmaTeamFromImport(
  turma: ImportedTurma | undefined,
  pacts: Set<PactId> | undefined,
  profileUrl: string,
  side: TeamSide,
): TurmaTeamResult {
  if (!turma) return { status: 'missing' };
  return buildTeam(
    turma,
    (doll) => ({ ...doll, contractBaseItemId: doll.contract?.baseItemId }),
    pacts ?? NO_PACTS,
    profileUrl,
    side,
  );
}

export function turmaTeamFromRecord(record: ActiveCharacterRecord, side: TeamSide): TurmaTeamResult {
  const turma: StoredTurma | undefined = record.turma;
  if (!turma) return { status: 'missing' };
  // The Turma profile is the same character, so the character's own pacts apply to it
  const playerPacts = decodeCharacterState(record.encoded, record.identity.name)?.pacts ?? NO_PACTS;
  return buildTeam(
    turma,
    (stored) => {
      const decoded = decodeCharacterState(stored.encoded, stored.identity.name);
      if (!decoded) return null;
      return {
        identity: stored.identity,
        level: stored.level,
        role: stored.role,
        stats: stored.stats,
        items: decoded.items,
        baseStats: decoded.baseStats,
        contractBaseItemId: stored.contract?.baseItemId,
      };
    },
    playerPacts,
    record.profileUrl,
    side,
  );
}
