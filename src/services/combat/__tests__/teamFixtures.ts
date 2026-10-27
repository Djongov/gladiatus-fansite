import type { FighterState, TeamFighter } from '../teamTypes';

/** A plain L143 fighter; tests override only what they exercise. */
export function makeFighter(overrides: Partial<TeamFighter> = {}): TeamFighter {
  return {
    id: 'attacker-0',
    name: 'Fighter',
    side: 'attacker',
    kind: 'mercenary',
    tactic: 'damage',
    mercenaryClass: 'damage',
    level: 143,
    image: null,
    maxLife: 10000,
    damageMin: 500,
    damageMax: 600,
    armour: 15000,
    armourAbsorbMin: 200,
    armourAbsorbMax: 250,
    strength: 600,
    dexterity: 900,
    agility: 650,
    constitution: 300,
    charisma: 450,
    intelligence: 400,
    critValue: 100,
    blockValue: 100,
    resilience: 50,
    healing: 0,
    critHealValue: 0,
    threatStat: 300,
    fixedChances: null,
    abilities: [],
    castAbilities: [],
    passiveEffects: [],
    ...overrides,
  };
}

export function makeState(fighter: TeamFighter, overrides: Partial<Omit<FighterState, 'fighter'>> = {}): FighterState {
  return {
    fighter,
    life: fighter.maxLife,
    threat: 0,
    totals: {
      damageDone: 0, swings: 0, landed: 0,
      damageTaken: 0, swingsReceived: 0, dodgedOrBlocked: 0,
      healingDone: 0, heals: 0, healingReceived: 0,
    },
    shield: null,
    nextAttackMultiplier: 1,
    castDueRounds: fighter.castAbilities.map((ability) => ability.rounds[0] ?? null),
    stunnedThroughRound: 0,
    weakenedPercent: 0,
    attackNeighbourNext: false,
    damageOverTime: [],
    ...overrides,
  };
}
