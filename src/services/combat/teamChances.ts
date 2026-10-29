/**
 * Chances between two fighters of a team fight. Fighters differ in level, so
 * every chance is worked out per (attacker, target) pair — the game's report
 * lists hit, double hit and block once per opponent.
 */
import {
  blockChanceFromBlockValue,
  chanceToDoubleHit,
  chanceToHit,
  critAvoidChanceFromResilience,
  critChanceFromAttackValue,
} from './chanceFormulas';
import type { TeamFighter } from './teamTypes';

const MAX_BLOCK_CHANCE = 50;
const BLOCK_PER_LEVEL_BELOW = 2;
const MAX_CRIT_HEAL_CHANCE = 50;

/** `dexterityMultiplier`: a dungeon enemy's enrage, which sharpens its aim as well as its blows. */
export function hitChance(attacker: TeamFighter, target: TeamFighter, dexterityMultiplier = 1): number {
  return chanceToHit(attacker.dexterity * dexterityMultiplier, target.agility);
}

export function doubleHitChance(attacker: TeamFighter, target: TeamFighter): number {
  return chanceToDoubleHit(attacker.charisma, attacker.dexterity, target.intelligence, target.agility);
}

export function ownCritChance(fighter: TeamFighter): number {
  return fighter.fixedChances?.crit ?? critChanceFromAttackValue(fighter.critValue, fighter.level);
}

export function ownCritAvoidChance(fighter: TeamFighter): number {
  return fighter.fixedChances?.critAvoid ?? critAvoidChanceFromResilience(fighter.resilience, fighter.level);
}

/** The target's crit avoidance scales the attacker's crit chance down (verified on a live report), not subtracts from it. */
export function critChance(attacker: TeamFighter, target: TeamFighter): number {
  return ownCritChance(attacker) * (1 - ownCritAvoidChance(target) / 100);
}

export function ownBlockChance(fighter: TeamFighter): number {
  return fighter.fixedChances?.block ?? blockChanceFromBlockValue(fighter.blockValue, fighter.level);
}

/** A fighter blocks 2% more for each level the attacker is below them (verified on every block column of a live report). */
export function blockAgainstFromBase(baseBlockChance: number, targetLevel: number, attackerLevel: number): number {
  return Math.min(MAX_BLOCK_CHANCE, baseBlockChance + BLOCK_PER_LEVEL_BELOW * Math.max(0, targetLevel - attackerLevel));
}

/** Enemies get the level bonus too: their panel's block is the base (verified on two dungeon reports). */
export function blockChanceAgainst(target: TeamFighter, attacker: TeamFighter): number {
  return blockAgainstFromBase(ownBlockChance(target), target.level, attacker.level);
}

export function critHealChance(fighter: TeamFighter): number {
  if (fighter.level <= 8) return 0;
  return Math.min((fighter.critHealValue * 52) / (fighter.level - 8) / 8, MAX_CRIT_HEAL_CHANCE);
}
