import type { Combatant, StrikeEvent, RoundEvent, BattleLog } from './types';

export type SimulationOptions = {
  maxRounds?: number;          // default 20 (PVE)
  random?: () => number;       // default Math.random
  firstAttacker?: 'defender' | 'coinflip'; // default 'defender' (PVE rule)
};

const DEFAULT_MAX_ROUNDS = 20;

function rollInt(random: () => number, min: number, max: number): number {
  if (max < min) return min;
  return Math.floor(random() * (max - min + 1)) + min;
}

function chanceToHit(attackerDex: number, defenderAgi: number): number {
  if (attackerDex + defenderAgi <= 0) return 0;
  return Math.floor((attackerDex / (attackerDex + defenderAgi)) * 100);
}

function chanceToDoubleHit(attackerCha: number, attackerDex: number, defenderInt: number, defenderAgi: number): number {
  if (defenderInt <= 0 || defenderAgi <= 0) return 0;
  return (attackerCha * attackerDex * 10) / (defenderInt * defenderAgi);
}

function strike(
  attacker: Combatant,
  defender: Combatant,
  effectiveCrit: number,
  strikes: StrikeEvent[],
  random: () => number,
  isSecondHalf: boolean
): void {
  const hitPct = chanceToHit(attacker.dexterity, defender.agility);
  if (random() * 100 >= hitPct) {
    strikes.push({
      attacker: attacker.name,
      defender: defender.name,
      result: 'miss',
      isCrit: false,
      isBlocked: false,
      isSecondHalfOfDoubleHit: isSecondHalf,
      damageRolled: 0,
      damageAfterMods: 0,
      absorbed: 0,
      finalDamage: 0,
      defenderHpAfter: defender.hp,
    });
  } else {
    const damageRolled = rollInt(random, attacker.damageMin, attacker.damageMax);
    const isCrit = random() * 100 < effectiveCrit;
    let damage = isCrit ? damageRolled * 2 : damageRolled;

    const isBlocked = random() * 100 < defender.blockChance;
    if (isBlocked) {
      damage = Math.floor(damage / 2);
    }

    const absorbed = rollInt(random, defender.armourAbsorbMin, defender.armourAbsorbMax);
    const finalDamage = Math.max(0, damage - absorbed);

    defender.hp = Math.max(0, defender.hp - finalDamage);

    strikes.push({
      attacker: attacker.name,
      defender: defender.name,
      result: 'hit',
      isCrit,
      isBlocked,
      isSecondHalfOfDoubleHit: isSecondHalf,
      damageRolled,
      damageAfterMods: damage,
      absorbed,
      finalDamage,
      defenderHpAfter: defender.hp,
    });
  }

  if (defender.hp <= 0 || isSecondHalf) return;

  // The double-hit attempt rolls whether or not the first strike landed —
  // live reports show the same side missing twice in one round (e.g. rounds
  // 15, 17 and 18 of a L126 Dracolich fight).
  const doublePct = chanceToDoubleHit(attacker.charisma, attacker.dexterity, defender.intelligence, defender.agility);
  if (random() * 100 < doublePct) {
    strike(attacker, defender, effectiveCrit, strikes, random, true);
  }
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
    const firstCrit = defenderStrikesFirst ? defenderEffectiveCrit : attackerEffectiveCrit;
    const secondCrit = defenderStrikesFirst ? attackerEffectiveCrit : defenderEffectiveCrit;

    strike(first, second, firstCrit, strikes, random, false);
    if (second.hp <= 0) {
      outcome = (second === D) ? 'attacker_wins' : 'defender_wins';
      outcomeReason = (second === D) ? 'defender_killed' : 'attacker_killed';
      rounds.push({ roundIndex: r, firstAttacker: first.name, strikes });
      earlyKo = true;
      break;
    }

    strike(second, first, secondCrit, strikes, random, false);
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
    let attackerDealt = 0;
    let defenderDealt = 0;
    for (const round of rounds) {
      for (const s of round.strikes) {
        if (s.attacker === A.name) attackerDealt += s.finalDamage;
        else defenderDealt += s.finalDamage;
      }
    }
    if (attackerDealt > defenderDealt) outcome = 'attacker_wins';
    else if (defenderDealt > attackerDealt) outcome = 'defender_wins';
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
