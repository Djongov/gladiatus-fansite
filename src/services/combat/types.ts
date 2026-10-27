export type Combatant = {
  name: string;
  image?: string;              // flat URL for the small report avatar
  costume?: string;            // raw costume sprite URL (drives animation in large portraits)
  gender?: 'male' | 'female';  // used for the face-image fallback when costume is absent
  level: number;
  hp: number;                  // current HP, mutated by the engine
  maxHp: number;
  damageMin: number;
  damageMax: number;
  armour: number;
  armourAbsorbMin: number;
  armourAbsorbMax: number;
  // Display-only base stats. Strength and Constitution don't affect the engine
  // (their effects are baked into damage and HP) but the battle report shows them.
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
  critChance: number;          // 0..50 %
  blockChance: number;         // 0..50 %
  critAvoidChance: number;     // 0..25 %
};

/** Which side of the fight a fighter is on: the one who started it, or the one attacked. */
export type FighterSide = 'attacker' | 'defender';

export type StrikeEvent = {
  attacker: string;
  /** Names can repeat (a fight against yourself), so replays and totals go by side */
  attackerSide: FighterSide;
  defender: string;
  result: 'miss' | 'hit';
  isCrit: boolean;
  isBlocked: boolean;
  isSecondHalfOfDoubleHit: boolean;
  damageRolled: number;
  damageAfterMods: number;
  absorbed: number;
  finalDamage: number;
  defenderHpAfter: number;
};

export type RoundEvent = {
  roundIndex: number;
  firstAttacker: string;       // always the defender in PVE (Gladiatus rule)
  strikes: StrikeEvent[];
};

export type BattleOutcome = 'attacker_wins' | 'defender_wins' | 'draw';
export type BattleOutcomeReason = 'attacker_killed' | 'defender_killed' | 'rounds_exhausted';

export type BattleLog = {
  attacker: Combatant;          // snapshot of starting state
  defender: Combatant;          // snapshot of starting state
  rounds: RoundEvent[];
  outcome: BattleOutcome;
  outcomeReason: BattleOutcomeReason;
};
