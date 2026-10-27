/**
 * Team fight engine (Circus Turma and dungeons, which differ by TeamFightRules
 * and the enemy's cast abilities). Each round, enemies with a cast ability due
 * cast it first, in place of acting; then every other living fighter acts once,
 * in a random order across both teams. The fight ends when a team is wiped out,
 * otherwise after rules.maxRounds on points.
 */
import type { OddsResult } from './simulateOdds';
import { rollInt, rollStrike } from './strike';
import { blockChanceAgainst, critChance, critHealChance, doubleHitChance, hitChance, ownCritChance } from './teamChances';
import type { CastEffect } from '@site/src/types/dungeons';
import type {
  CastAbility,
  FighterSnapshot,
  FighterState,
  FighterTotals,
  SwingEvent,
  TeamAction,
  TeamBattleLog,
  TeamFighter,
  TeamFightRules,
  TeamOutcomeReason,
  TeamRound,
} from './teamTypes';
import type { BattleOutcome } from './types';

/** A team's score: damage dealt plus half the healing done (exact for both teams of a live report). */
export function teamPoints(totals: Pick<FighterTotals, 'damageDone' | 'healingDone'>[]): number {
  return totals.reduce((sum, total) => sum + total.damageDone + Math.floor(total.healingDone / 2), 0);
}

const emptyTotals = (): FighterTotals => ({
  damageDone: 0,
  swings: 0,
  landed: 0,
  damageTaken: 0,
  swingsReceived: 0,
  dodgedOrBlocked: 0,
  healingDone: 0,
  heals: 0,
  healingReceived: 0,
});

const isAlive = (state: FighterState): boolean => state.life > 0;

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapWith = Math.floor(random() * (index + 1));
    [result[index], result[swapWith]] = [result[swapWith], result[index]];
  }
  return result;
}

/** The living teammate missing the most life (first in team order on ties), or null when nobody is hurt. */
function mostWounded(team: FighterState[]): FighterState | null {
  let wounded: FighterState | null = null;
  for (const state of team) {
    const missing = state.fighter.maxLife - state.life;
    if (isAlive(state) && missing > 0 && (!wounded || missing > wounded.fighter.maxLife - wounded.life)) {
      wounded = state;
    }
  }
  return wounded;
}

type Fight = {
  rules: TeamFightRules;
  random: () => number;
  roundIndex: number;
};

/** What's left of a fighter's damage and healing after an enemy's weakening. */
const weakening = (state: FighterState): number => Math.max(0, 1 - state.weakenedPercent / 100);

/** Heals up to the fighter's maximum life; returns what it healed. */
function restoreLife(state: FighterState, amount: number): number {
  const healed = Math.max(0, Math.min(amount, state.fighter.maxLife - state.life));
  state.life += healed;
  return healed;
}

/** Up to `count` different living fighters, picked at random. */
function pickRandom(fighters: FighterState[], count: number, random: () => number): FighterState[] {
  return shuffled(fighters.filter(isAlive), random).slice(0, count);
}

/** Takes what the target's shield can soak out of `damage`; the rest goes through. */
function absorbByShield(target: FighterState, damage: number): { absorbed: number; broken: boolean } {
  if (!target.shield || damage <= 0) return { absorbed: 0, broken: false };
  const absorbed = Math.min(damage, target.shield.remaining);
  target.shield.remaining -= absorbed;
  const broken = target.shield.remaining === 0;
  if (broken) target.shield = null;
  return { absorbed, broken };
}

function swing(fight: Fight, attacker: FighterState, target: FighterState, isDoubleHit: boolean): SwingEvent {
  const { fighter } = attacker;
  const enrage = fighter.kind === 'enemy' ? fight.rules.enemyEnrage(fight.roundIndex + 1) : 1;
  const damageScale = enrage * weakening(attacker);
  const roll = rollStrike(
    {
      hit: hitChance(fighter, target.fighter, enrage),
      crit: critChance(fighter, target.fighter),
      block: blockChanceAgainst(target.fighter, fighter),
    },
    { min: Math.round(fighter.damageMin * damageScale), max: Math.round(fighter.damageMax * damageScale) },
    { min: target.fighter.armourAbsorbMin, max: target.fighter.armourAbsorbMax },
    fight.random,
  );

  const context = { attacker, target, roundIndex: fight.roundIndex };
  // A rage empowers the next attack whether it lands or not
  const multiplier = attacker.nextAttackMultiplier;
  attacker.nextAttackMultiplier = 1;
  let damage = roll.finalDamage * multiplier;
  if (roll.landed) {
    for (const ability of fighter.abilities) damage = ability.modifyOutgoingDamage?.(damage, context) ?? damage;
    for (const ability of target.fighter.abilities) damage = ability.modifyIncomingDamage?.(damage, context) ?? damage;
  }
  const shield = absorbByShield(target, damage);
  // Overkill doesn't count: damage is capped at the life the target had left
  damage = Math.min(Math.max(0, damage - shield.absorbed), target.life);

  target.life -= damage;
  attacker.totals.swings++;
  attacker.totals.damageDone += damage;
  target.totals.swingsReceived++;
  target.totals.damageTaken += damage;
  if (damage > 0) attacker.totals.landed++;
  else target.totals.dodgedOrBlocked++;
  attacker.threat += fight.rules.threatGain(fighter, { type: 'swing', damage });
  for (const effect of fighter.passiveEffects) {
    if (effect.type === 'lifesteal') restoreLife(attacker, Math.floor((damage * effect.percent) / 100));
  }

  return {
    landed: roll.landed,
    isCrit: roll.isCrit,
    isBlocked: roll.isBlocked,
    isDoubleHit,
    damage,
    shieldAbsorbed: shield.absorbed,
    shieldBroken: shield.broken,
  };
}

function attack(fight: Fight, actor: FighterState, enemies: FighterState[]): TeamAction {
  let target = fight.rules.pickTarget(actor, enemies, fight.random);
  if (actor.attackNeighbourNext) {
    actor.attackNeighbourNext = false;
    target = neighbourOf(target, enemies);
  }
  return attackTarget(fight, actor, target);
}

/** The fighter after `target` in its team's order among the living, wrapping round (the target itself when alone). */
function neighbourOf(target: FighterState, team: FighterState[]): FighterState {
  const living = team.filter(isAlive);
  return living[(living.indexOf(target) + 1) % living.length];
}

/** One attack at a chosen target, with a possible double hit. */
function attackTarget(fight: Fight, actor: FighterState, target: FighterState): TeamAction {
  const swings = [swing(fight, actor, target, false)];
  if (isAlive(target) && fight.random() * 100 < doubleHitChance(actor.fighter, target.fighter)) {
    swings.push(swing(fight, actor, target, true));
  }
  return { type: 'attack', actorId: actor.fighter.id, targetId: target.fighter.id, swings };
}

function heal(fight: Fight, healer: FighterState, patient: FighterState): TeamAction {
  const isCrit = fight.random() * 100 < critHealChance(healer.fighter);
  const healing = Math.round((isCrit ? healer.fighter.healing * 2 : healer.fighter.healing) * weakening(healer));
  const amount = Math.min(healing, patient.fighter.maxLife - patient.life);

  patient.life += amount;
  healer.totals.heals++;
  healer.totals.healingDone += amount;
  patient.totals.healingReceived += amount;
  healer.threat += fight.rules.threatGain(healer.fighter, { type: 'heal', amount });

  return { type: 'heal', actorId: healer.fighter.id, targetId: patient.fighter.id, amount, isCrit };
}

function act(fight: Fight, actor: FighterState, allies: FighterState[], enemies: FighterState[]): TeamAction {
  if (actor.fighter.tactic === 'healer') {
    const patient = mostWounded(allies);
    if (patient) return heal(fight, actor, patient);
  }
  return attack(fight, actor, enemies.filter(isAlive));
}

/** When a cast ability comes again: its next listed round, else `repeatEvery` after this cast. */
function nextCastRound(ability: CastAbility, castRound: number): number | null {
  const listed = ability.rounds.find((round) => round > castRound);
  if (listed !== undefined) return listed;
  return ability.repeatEvery ? castRound + ability.repeatEvery : null;
}

// The pages write a cast's target as "{random NPC}" (sometimes "{randon NPC}")
const RANDOM_TARGET_PLACEHOLDER = /\{rando[mn] NPCs?\}/gi;

type CastOutcome = {
  hits: { targetId: string; damage: number }[];
  healed: number;
  targets: FighterState[];
  /** A group attack's swings, shown after the cast */
  attacks: TeamAction[];
};

/** Fixed damage (armour ignored), capped at the target's life; returns what it dealt. */
function dealFixedDamage(source: FighterState, target: FighterState, amount: number): number {
  const damage = Math.min(amount, target.life);
  target.life -= damage;
  target.totals.damageTaken += damage;
  source.totals.damageDone += damage;
  return damage;
}

/** The members a "random NPC" / group effect lands on. */
function effectTargets(fight: Fight, living: FighterState[], targets: number | 'random' | 'all' | 'allButTank'): FighterState[] {
  if (targets === 'all') return living;
  if (targets === 'allButTank') return living.filter((state) => state.fighter.tactic !== 'tank');
  return pickRandom(living, targets === 'random' ? 1 : targets, fight.random);
}

/** Applies one cast effect to the caster or its opponents, adding what it did to `outcome`. */
function applyCastEffect(fight: Fight, caster: FighterState, opponents: FighterState[], effect: CastEffect, roundNumber: number, outcome: CastOutcome) {
  const living = opponents.filter(isAlive);
  if (effect.type === 'shield') caster.shield = { remaining: effect.absorb, lastRound: roundNumber + effect.rounds - 1 };
  else if (effect.type === 'empowerNextAttack') caster.nextAttackMultiplier = effect.multiplier;
  else if (effect.type === 'attackNeighbour') caster.attackNeighbourNext = true;
  else if (effect.type === 'groupAttack') {
    for (const target of living) if (isAlive(target)) outcome.attacks.push(attackTarget(fight, caster, target));
  } else if (effect.type === 'groupDamage') {
    const targets = effectTargets(fight, living, effect.targets);
    let dealt = 0;
    for (const target of targets) {
      const damage = dealFixedDamage(caster, target, rollInt(fight.random, effect.damage.min, effect.damage.max));
      dealt += damage;
      outcome.hits.push({ targetId: target.fighter.id, damage });
    }
    if (effect.drain) outcome.healed += restoreLife(caster, dealt);
    outcome.targets.push(...targets);
  } else if (effect.type === 'damageOverTime') {
    const targets = effectTargets(fight, living, effect.targets);
    for (const target of targets) target.damageOverTime.push({ source: caster, damage: effect.damage, lastRound: roundNumber + effect.rounds - 1 });
    outcome.targets.push(...targets);
  } else if (effect.type === 'selfHeal') {
    const amount = rollInt(fight.random, effect.amount.min, effect.amount.max);
    const isCrit = fight.random() * 100 < ownCritChance(caster.fighter);
    outcome.healed += restoreLife(caster, isCrit ? amount * 2 : amount);
  } else if (effect.type === 'stun') {
    const targets = effectTargets(fight, living, effect.targets);
    for (const target of targets) target.stunnedThroughRound = Math.max(target.stunnedThroughRound, roundNumber + effect.rounds - 1);
    outcome.targets.push(...targets);
  }
}

/**
 * Casts the first cast ability that's due, if any. The caster then sits the round out,
 * unless the ability only redirects its attack (attackNeighbour).
 */
function castDueAbility(
  fight: Fight,
  caster: FighterState,
  opponents: FighterState[],
  roundNumber: number,
): { actions: TeamAction[]; keepsTurn: boolean } | null {
  const index = caster.castDueRounds.findIndex((due) => due !== null && due <= roundNumber);
  if (index === -1) return null;

  const ability = caster.fighter.castAbilities[index];
  caster.castDueRounds[index] = nextCastRound(ability, roundNumber);
  const outcome: CastOutcome = { hits: [], healed: 0, targets: [], attacks: [] };
  for (const effect of ability.effects) applyCastEffect(fight, caster, opponents, effect, roundNumber, outcome);
  const targetNames = [...new Set(outcome.targets.map((target) => target.fighter.name))].join(', ');
  const text = targetNames ? ability.text.replace(RANDOM_TARGET_PLACEHOLDER, targetNames) : ability.text;
  const cast: TeamAction = { type: 'cast', actorId: caster.fighter.id, text, hits: outcome.hits, healed: outcome.healed };
  return { actions: [cast, ...outcome.attacks], keepsTurn: ability.effects.every((effect) => effect.type === 'attackNeighbour') };
}

/** Damage over time ticks on everyone it's on, and runs out after its last round. */
function tickDamageOverTime(fight: Fight, living: FighterState[], roundNumber: number, actions: TeamAction[]) {
  for (const state of living) {
    state.damageOverTime = state.damageOverTime.filter((effect) => effect.lastRound >= roundNumber);
    for (const effect of state.damageOverTime) {
      if (!isAlive(state)) break;
      const damage = dealFixedDamage(effect.source, state, rollInt(fight.random, effect.damage.min, effect.damage.max));
      actions.push({ type: 'tick', actorId: effect.source.fighter.id, targetId: state.fighter.id, damage });
    }
  }
}

/**
 * Round-start effects: expired shields fade, ability hooks run, enemies' weakening
 * grows, and due abilities are cast (the casters' turn).
 */
function startRound(
  fight: Fight,
  living: FighterState[],
  opponentsOf: (state: FighterState) => FighterState[],
): { actions: TeamAction[]; casters: Set<FighterState> } {
  const roundNumber = fight.roundIndex + 1;
  const actions: TeamAction[] = [];
  const casters = new Set<FighterState>();
  for (const state of living) {
    if (state.shield && state.shield.lastRound < roundNumber) state.shield = null;
    for (const ability of state.fighter.abilities) ability.onRoundStart?.(state, fight.roundIndex);
    for (const effect of state.fighter.passiveEffects) {
      if (effect.type === 'weakenEachRound') for (const opponent of opponentsOf(state)) opponent.weakenedPercent += effect.percent;
    }
  }
  for (const state of living) {
    const cast = isAlive(state) ? castDueAbility(fight, state, opponentsOf(state), roundNumber) : null;
    if (cast) {
      actions.push(...cast.actions);
      if (!cast.keepsTurn) casters.add(state);
    }
  }
  tickDamageOverTime(fight, living, roundNumber, actions);
  return { actions, casters };
}

function snapshot(states: FighterState[]): Record<string, FighterSnapshot> {
  return Object.fromEntries(states.map((state) => [state.fighter.id, { life: state.life, threat: state.threat }]));
}

export function simulateTeamFight(
  attackers: TeamFighter[],
  defenders: TeamFighter[],
  rules: TeamFightRules,
  random: () => number = Math.random,
): TeamBattleLog {
  const toState = (fighter: TeamFighter): FighterState => ({
    fighter,
    life: fighter.maxLife,
    threat: 0,
    totals: emptyTotals(),
    shield: null,
    nextAttackMultiplier: 1,
    castDueRounds: fighter.castAbilities.map((ability) => ability.rounds[0] ?? null),
    stunnedThroughRound: 0,
    weakenedPercent: 0,
    attackNeighbourNext: false,
    damageOverTime: [],
  });
  const attackerStates = attackers.map(toState);
  const defenderStates = defenders.map(toState);
  const everyone = [...attackerStates, ...defenderStates];
  const fight: Fight = { rules, random, roundIndex: 0 };
  const opponentsOf = (state: FighterState) => (state.fighter.side === 'attacker' ? defenderStates : attackerStates);
  const teamWipedOut = (): TeamOutcomeReason | null => {
    if (!defenderStates.some(isAlive)) return 'defenders_dead';
    if (!attackerStates.some(isAlive)) return 'attackers_dead';
    return null;
  };

  const rounds: TeamRound[] = [];
  let wipedOut: TeamOutcomeReason | null = null;

  for (let roundIndex = 0; roundIndex < rules.maxRounds && !wipedOut; roundIndex++) {
    fight.roundIndex = roundIndex;
    const living = everyone.filter(isAlive);
    const { actions, casters } = startRound(fight, living, opponentsOf);
    wipedOut = teamWipedOut();

    for (const actor of shuffled(living, random)) {
      if (wipedOut) break;
      if (casters.has(actor) || !isAlive(actor) || actor.stunnedThroughRound >= roundIndex + 1) continue;
      const isAttacker = actor.fighter.side === 'attacker';
      actions.push(act(fight, actor, isAttacker ? attackerStates : defenderStates, opponentsOf(actor)));
      wipedOut = teamWipedOut();
    }
    rounds.push({ index: roundIndex, actions, endOfRound: snapshot(everyone) });
  }

  const points = {
    attacker: teamPoints(attackerStates.map((state) => state.totals)),
    defender: teamPoints(defenderStates.map((state) => state.totals)),
  };
  let outcome: BattleOutcome;
  if (wipedOut) outcome = wipedOut === 'defenders_dead' ? 'attacker_wins' : 'defender_wins';
  else outcome = rules.outcomeAtTimeout(points);

  return {
    attackers,
    defenders,
    rounds,
    totals: Object.fromEntries(everyone.map((state) => [state.fighter.id, state.totals])),
    points,
    outcome,
    outcomeReason: wipedOut ?? 'rounds_exhausted',
  };
}

/** Runs `n` fights between two fixed teams and counts the attacker's results. */
export function simulateTeamOdds(
  attackers: TeamFighter[],
  defenders: TeamFighter[],
  rules: TeamFightRules,
  n: number,
  random: () => number = Math.random,
): OddsResult {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (let fightIndex = 0; fightIndex < n; fightIndex++) {
    const { outcome } = simulateTeamFight(attackers, defenders, rules, random);
    if (outcome === 'attacker_wins') wins++;
    else if (outcome === 'defender_wins') losses++;
    else draws++;
  }
  return { total: n, ran: n, wins, losses, draws };
}
