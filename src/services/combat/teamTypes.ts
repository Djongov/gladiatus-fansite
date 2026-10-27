/**
 * Team fights (Circus Turma now, dungeons later): fighters, per-fight state,
 * the log the report renders, and the rules object that makes a fight type.
 */
import type { CastEffect, PassiveEffect } from '@site/src/types/dungeons';
import type { Range } from '@site/src/types/expeditions';
import type { BattleOutcome } from './types';

/** The doll's in-game tactic ("Direct attention to oneself" / "Dish out damage" / "Heal group members"). */
export type Tactic = 'tank' | 'damage' | 'healer';
/** Players, their mercenaries, and the NPCs they fight (dungeon enemies). */
export type FighterKind = 'player' | 'mercenary' | 'enemy';
export type TeamSide = 'attacker' | 'defender';

export type TeamFighter = {
  /** Unique within a fight: `${side}-${index}` */
  id: string;
  name: string;
  side: TeamSide;
  kind: FighterKind;
  tactic: Tactic;
  /** The mercenary's own class from its contract (null for players); the tactic can differ */
  mercenaryClass: Tactic | null;
  level: number;
  image: string | null;
  maxLife: number;
  damageMin: number;
  damageMax: number;
  armour: number;
  armourAbsorbMin: number;
  armourAbsorbMax: number;
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
  critValue: number;
  blockValue: number;
  resilience: number;
  healing: number;
  critHealValue: number;
  /** The game's threat for this doll (Charisma part + items; healers: items only) */
  threatStat: number;
  /** Crit / block / crit-avoid % taken as given (an enemy's stat panel) instead of worked out from the values; null for players and mercenaries */
  fixedChances: { crit: number; block: number; critAvoid: number } | null;
  /** Special abilities (dungeon bosses); none for Turma fighters */
  abilities: FighterAbility[];
  /** Abilities cast instead of attacking (dungeon bosses), in priority order; none for Turma fighters */
  castAbilities: CastAbility[];
  /** Effects that work every round without costing a turn (Corruption's lifesteal and weakening) */
  passiveEffects: PassiveEffect[];
};

/**
 * An ability cast at the start of a round instead of attacking: first at each of `rounds`,
 * then every `repeatEvery` rounds after the last cast. One cast per round; when two are
 * due, the earlier-listed one goes first and the other waits (Clíodhna's report).
 */
export type CastAbility = {
  /** The game's line in the report */
  text: string;
  rounds: number[];
  repeatEvery: number | null;
  effects: CastEffect[];
};

export type FighterTotals = {
  damageDone: number;
  swings: number;
  /** Swings that landed and dealt damage */
  landed: number;
  damageTaken: number;
  swingsReceived: number;
  /** Swings received that missed or dealt no damage */
  dodgedOrBlocked: number;
  healingDone: number;
  heals: number;
  healingReceived: number;
};

export type FighterState = {
  fighter: TeamFighter;
  life: number;
  /** Threat built up during the fight; starts at 0 */
  threat: number;
  totals: FighterTotals;
  /** An active shield: damage it can still absorb, and the last round (1-based) it lasts */
  shield: { remaining: number; lastRound: number } | null;
  /** Applied to the next attack's damage, then reset to 1 (a rage) */
  nextAttackMultiplier: number;
  /** Per cast ability, the round (1-based) it's next due; null once it won't come again */
  castDueRounds: (number | null)[];
  /** Stunned: sits out every round up to and including this one (0 = never stunned) */
  stunnedThroughRound: number;
  /** Damage and healing lost to an enemy's weakening, % of base */
  weakenedPercent: number;
  /** The next attack goes to the fighter after the usual target (Pyro, Nekromar, Lord Aesteron) */
  attackNeighbourNext: boolean;
  /** Damage over time on this fighter: who cast it, how much per round, and its last round (1-based) */
  damageOverTime: { source: FighterState; damage: Range; lastRound: number }[];
};

export type SwingEvent = {
  landed: boolean;
  isCrit: boolean;
  isBlocked: boolean;
  /** The extra swing of a double hit */
  isDoubleHit: boolean;
  /** Damage applied to life, after abilities, the target's shield and the overkill cap */
  damage: number;
  /** Damage the target's shield soaked up */
  shieldAbsorbed: number;
  /** This blow used up the target's shield ("*Shield removed*") */
  shieldBroken: boolean;
};

export type TeamAction =
  | { type: 'attack'; actorId: string; targetId: string; swings: SwingEvent[] }
  | { type: 'heal'; actorId: string; targetId: string; amount: number; isCrit: boolean }
  | {
      type: 'cast';
      actorId: string;
      /** The game's line, with "{random NPC}" filled in when the cast picks a target */
      text: string;
      /** Fixed damage dealt to group members */
      hits: { targetId: string; damage: number }[];
      /** Life the caster drained back */
      healed: number;
    }
  /** A round-start tick of damage over time */
  | { type: 'tick'; actorId: string; targetId: string; damage: number };

export type FighterSnapshot = { life: number; threat: number };

export type TeamRound = {
  /** 0-based */
  index: number;
  actions: TeamAction[];
  /** Every fighter's life and threat when the round ended, keyed by fighter id */
  endOfRound: Record<string, FighterSnapshot>;
};

export type TeamOutcomeReason = 'attackers_dead' | 'defenders_dead' | 'rounds_exhausted';

export type TeamBattleLog = {
  attackers: TeamFighter[];
  defenders: TeamFighter[];
  rounds: TeamRound[];
  totals: Record<string, FighterTotals>;
  points: { attacker: number; defender: number };
  outcome: BattleOutcome;
  outcomeReason: TeamOutcomeReason;
};

export type StrikeContext = { attacker: FighterState; target: FighterState; roundIndex: number };

/** Hooks a special ability (e.g. a dungeon boss's) can use; the engine calls whichever are present. */
export type FighterAbility = {
  id: string;
  onRoundStart?(self: FighterState, roundIndex: number): void;
  modifyOutgoingDamage?(damage: number, ctx: StrikeContext): number;
  modifyIncomingDamage?(damage: number, ctx: StrikeContext): number;
};

export type ThreatEvent = { type: 'swing'; damage: number } | { type: 'heal'; amount: number };

/** What makes a fight type (Turma, a dungeon, …) differ from another. */
export type TeamFightRules = {
  maxRounds: number;
  /** Multiplies enemies' damage and the Dexterity they hit with in this round (1-based) */
  enemyEnrage(roundNumber: number): number;
  pickTarget(actor: FighterState, enemies: FighterState[], random: () => number): FighterState;
  threatGain(actor: TeamFighter, event: ThreatEvent): number;
  /** Who wins when the rounds run out and both teams still stand */
  outcomeAtTimeout(points: { attacker: number; defender: number }): BattleOutcome;
};
