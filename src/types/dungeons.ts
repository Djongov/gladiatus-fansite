import type { Range } from './expeditions';

export type CountryKey = 'italy' | 'africa' | 'germania' | 'britannia';

/** A link as the pages write it: "Fairground (Level 80, Africa)". `path` is the full site path,
 *  since some targets aren't dungeons (Alpha & Omega's next is the Forest Fortress expedition). */
export type DungeonLink = { name: string; path: string; level: number | null; country: string | null };

/** How sure the page is of a levels line: "✓ Verified", no mark, or a trailing "?". */
export type LevelsStatus = 'verified' | 'unverified' | 'uncertain';

/** A levels line ("Boss item level drop: 88-100 ✓ Verified"); `levels` null = "???" (unknown). */
export type LevelsFact = { levels: Range | null; status: LevelsStatus };

/**
 * What an ability does in the simulator, from a report or the page's numbers.
 * Cast effects take the boss's turn (all but attackNeighbour):
 * - shield: absorbs damage for some rounds
 * - empowerNextAttack: multiplies the next attack
 * - groupAttack: a normal swing at every group member
 * - attackNeighbour: this round's attack hits the fighter after the usual target, in team order
 * - groupDamage: fixed damage, armour ignored, to `targets` random group members or all; `drain` heals the boss by what it dealt
 * - damageOverTime: fixed damage to one random member or all, at the start of this round and the next `rounds` − 1
 * - selfHeal: heals the boss; it can crit (×2) at the boss's crit chance
 * - stun: `targets` (one random member, all, or all but the tanks) skip this round and the next `rounds` − 1
 * - unknown: the effect isn't worked out, but the cast still costs the turn
 * Passive effects work every round and cost nothing:
 * - lifesteal: the boss heals `percent` of the damage it deals
 * - weakenEachRound: the group's damage and healing drop by `percent` of their base every round
 */
export type AbilityEffect =
  | { type: 'shield'; absorb: number; rounds: number }
  | { type: 'empowerNextAttack'; multiplier: number }
  | { type: 'groupAttack' }
  | { type: 'attackNeighbour' }
  | { type: 'groupDamage'; damage: Range; targets: number | 'all'; drain: boolean }
  | { type: 'damageOverTime'; targets: 'random' | 'all'; damage: Range; rounds: number }
  | { type: 'selfHeal'; amount: Range }
  | { type: 'stun'; targets: 'random' | 'all' | 'allButTank'; rounds: number }
  | { type: 'unknown' }
  | { type: 'lifesteal'; percent: number }
  | { type: 'weakenEachRound'; percent: number };

export type PassiveEffect = Extract<AbilityEffect, { type: 'lifesteal' | 'weakenEachRound' }>;
export type CastEffect = Exclude<AbilityEffect, PassiveEffect>;

export const isPassiveEffect = (effect: AbilityEffect): effect is PassiveEffect =>
  effect.type === 'lifesteal' || effect.type === 'weakenEachRound';

/** A boss's special ability: when it fires and what it does, as the page describes it. */
export type DungeonAbility = {
  /** Rounds listed explicitly */
  rounds: number[];
  /** "or every N rounds" */
  repeatEvery: number | null;
  /** The game's text, verbatim */
  gameText: string;
  /** The author's explanation (markdown) */
  notes: string | null;
  /**
   * Set once a report or the page's numbers show how the ability plays out. A boss is only
   * simulated with its abilities when every one of them has effects (see dungeonEnemyToFighter).
   */
  effects?: AbilityEffect[];
};

/** One enemy as its in-game stat panel showed it (a single fight's numbers, not ranges). */
export type DungeonEnemy = {
  /** kebab-case of the name, unique within the dungeon */
  id: string;
  name: string;
  isBoss: boolean;
  /** CDN-relative portrait path */
  image: string;
  level: number;
  life: number;
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
  armour: number;
  armourAbsorb: Range;
  damage: Range;
  /** Percentages exactly as the panel shows them */
  critChance: number;
  blockChance: number;
  critAvoidChance: number;
  threat: number;
  abilities: DungeonAbility[];
};

export type Dungeon = {
  name: string;
  /** "africa-dungeons/fairground": the doc slug without "/dungeons/" */
  slug: string;
  entryLevel: number;
  /** As the page writes it: "12", "5-10 (varies)" */
  dungeonPoints: string | null;
  enemyLevels: LevelsFact;
  minionDrop: LevelsFact;
  bossDrop: LevelsFact;
  parentExpedition: DungeonLink | null;
  /** This dungeon's advanced dungeon */
  advancedDungeon: DungeonLink | null;
  /** The dungeon this one is the advanced version of */
  advancedDungeonOf: DungeonLink | null;
  /** Empty = none (first / last dungeon); several = "… or …" */
  previousDungeons: DungeonLink[];
  nextDungeons: DungeonLink[];
  enemies: DungeonEnemy[];
};

export type DungeonsData = Record<CountryKey, { name: string; dungeons: Dungeon[] }>;
