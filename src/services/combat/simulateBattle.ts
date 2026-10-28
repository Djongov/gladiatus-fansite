import type { Combatant, StrikeEvent, RoundEvent, BattleLog, FighterSide } from './types';
import { chanceToDoubleHit, chanceToHit } from './chanceFormulas';
import { rollStrike } from './strike';

export type SimulationOptions = {
  maxRounds?: number;          // default 20 (PVE)
  random?: () => number;       // default Math.random
  firstAttacker?: 'defender' | 'coinflip'; // default 'defender' (PVE rule)
};

const DEFAULT_MAX_ROUNDS = 20;

function strike(
  attacker: Combatant,
  attackerSide: FighterSide,
  defender: Combatant,
  effectiveCrit: number,
  strikes: StrikeEvent[],
  random: () => number,
  isSecondHalf: boolean
): void {
  const roll = rollStrike(
    { hit: chanceToHit(attacker.dexterity, defender.agility), crit: effectiveCrit, block: defender.blockChance },
    { min: attacker.damageMin, max: attacker.damageMax },
    { min: defender.armourAbsorbMin, max: defender.armourAbsorbMax },
    random,
  );
  defender.hp = Math.max(0, defender.hp - roll.finalDamage);
  strikes.push({
    attacker: attacker.name,
    attackerSide,
    defender: defender.name,
    result: roll.landed ? 'hit' : 'miss',
    isCrit: roll.isCrit,
    isBlocked: roll.isBlocked,
    isSecondHalfOfDoubleHit: isSecondHalf,
    damageRolled: roll.damageRolled,
    damageAfterMods: roll.damageAfterMods,
    absorbed: roll.absorbed,
    finalDamage: roll.finalDamage,
    defenderHpAfter: defender.hp,
  });

  if (defender.hp <= 0 || isSecondHalf) return;

  // The double-hit attempt rolls whether or not the first strike landed —
  // live reports show the same side missing twice in one round (e.g. rounds
  // 15, 17 and 18 of a L126 Dracolich fight).
  const doublePct = chanceToDoubleHit(attacker.charisma, attacker.dexterity, defender.intelligence, defender.agility);
  if (random() * 100 < doublePct) {
    strike(attacker, attackerSide, defender, effectiveCrit, strikes, random, true);
  }
}

/** Damage each side dealt over the fight: decides a fight that runs out of rounds. */
export function damageDealtBySide(rounds: RoundEvent[]): Record<FighterSide, number> {
  const dealt: Record<FighterSide, number> = { attacker: 0, defender: 0 };
  for (const round of rounds) {
    for (const s of round.strikes) dealt[s.attackerSide] += s.finalDamage;
  }
  return dealt;
}

/** How one side's swings went: each half of a double hit is its own attack. */
export type StrikeTally = { attacks: number; criticalHits: number; misses: number; blockedByOpponent: number };

/** Each side's attacks, critical hits, misses and attacks the opponent blocked, for the report. */
export function strikeTallyBySide(rounds: RoundEvent[]): Record<FighterSide, StrikeTally> {
  const empty = (): StrikeTally => ({ attacks: 0, criticalHits: 0, misses: 0, blockedByOpponent: 0 });
  const tally: Record<FighterSide, StrikeTally> = { attacker: empty(), defender: empty() };
  for (const round of rounds) {
    for (const s of round.strikes) {
      const side = tally[s.attackerSide];
      side.attacks += 1;
      if (s.isCrit) side.criticalHits += 1;
      if (s.result === 'miss') side.misses += 1;
      if (s.isBlocked) side.blockedByOpponent += 1;
    }
  }
  return tally;
}

export function simulateBattle(
  attacker: Combatant,
  defender: Combatant,
  options: SimulationOptions = {}
): BattleLog {
  const random = options.random ?? Math.random;
  const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const firstAttackerMode = options.firstAttacker ?? 'defender';

  const attackerStart: Combatant = { ...attacker };
  const defenderStart: Combatant = { ...defender };

  const A: Combatant = { ...attacker, hp: attacker.maxHp };
  const D: Combatant = { ...defender, hp: defender.maxHp };

  const attackerEffectiveCrit = Math.max(0, A.critChance - D.critAvoidChance);
  const defenderEffectiveCrit = Math.max(0, D.critChance - A.critAvoidChance);

  const rounds: RoundEvent[] = [];
  let outcome: BattleLog['outcome'] = 'draw';
  let outcomeReason: BattleLog['outcomeReason'] = 'rounds_exhausted';
  let earlyKo = false;

  for (let r = 0; r < maxRounds; r++) {
    const strikes: StrikeEvent[] = [];

    // PVE: defender strikes first every round.
    // PVP: per-round coinflip decides who strikes first.
    const defenderStrikesFirst = firstAttackerMode === 'coinflip'
      ? random() < 0.5
      : true;

    const first = defenderStrikesFirst ? D : A;
    const second = defenderStrikesFirst ? A : D;
    const firstSide: FighterSide = defenderStrikesFirst ? 'defender' : 'attacker';
    const secondSide: FighterSide = defenderStrikesFirst ? 'attacker' : 'defender';
    const firstCrit = defenderStrikesFirst ? defenderEffectiveCrit : attackerEffectiveCrit;
    const secondCrit = defenderStrikesFirst ? attackerEffectiveCrit : defenderEffectiveCrit;

    strike(first, firstSide, second, firstCrit, strikes, random, false);
    if (second.hp <= 0) {
      outcome = (second === D) ? 'attacker_wins' : 'defender_wins';
      outcomeReason = (second === D) ? 'defender_killed' : 'attacker_killed';
      rounds.push({ roundIndex: r, firstAttacker: first.name, strikes });
      earlyKo = true;
      break;
    }

    strike(second, secondSide, first, secondCrit, strikes, random, false);
    if (first.hp <= 0) {
      outcome = (first === D) ? 'attacker_wins' : 'defender_wins';
      outcomeReason = (first === D) ? 'defender_killed' : 'attacker_killed';
      rounds.push({ roundIndex: r, firstAttacker: first.name, strikes });
      earlyKo = true;
      break;
    }

    rounds.push({ roundIndex: r, firstAttacker: first.name, strikes });
  }

  if (!earlyKo) {
    // Rounds exhausted with both sides alive: whoever dealt more total
    // damage wins (user-confirmed live rule, applies to PVE and PVP alike).
    const dealt = damageDealtBySide(rounds);
    if (dealt.attacker > dealt.defender) outcome = 'attacker_wins';
    else if (dealt.defender > dealt.attacker) outcome = 'defender_wins';
    else outcome = 'draw';
    outcomeReason = 'rounds_exhausted';
  }

  return {
    attacker: attackerStart,
    defender: defenderStart,
    rounds,
    outcome,
    outcomeReason,
  };
}
