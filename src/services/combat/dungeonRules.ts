/**
 * Dungeon fight rules: your Turma team against a dungeon enemy, from three dungeon
 * reports (sample/evil-fairy-queen.txt, sample/barkskin-dwarf-*.txt). Fights ran to
 * rounds 49, 72 and 140; no round limit showed, the enrage ends them instead.
 */
import { TURMA_RULES } from './turmaRules';
import type { TeamFightRules } from './teamTypes';

/** A safety cap, not the game's: only a team that can't hurt the enemy ever reaches it. */
const DUNGEON_MAX_ROUNDS = 300;

const ENRAGE_STARTS_AFTER_ROUND = 60;
const ENRAGE_PER_ROUND = 0.1;

/**
 * From round 61 an enemy's damage and Dexterity grow by 10% of their base each round
 * (×2 at round 70, ×5 at 100). Fits every Barkskin Dwarf hit from round 61 to 138.
 */
export function dungeonEnrage(roundNumber: number): number {
  const enragedRounds = Math.max(0, roundNumber - ENRAGE_STARTS_AFTER_ROUND);
  return Math.round((1 + ENRAGE_PER_ROUND * enragedRounds) * 10) / 10;
}

export const DUNGEON_RULES: TeamFightRules = {
  ...TURMA_RULES,
  maxRounds: DUNGEON_MAX_ROUNDS,
  enemyEnrage: dungeonEnrage,
  // Only killing the enemy wins; points don't decide a dungeon fight
  outcomeAtTimeout: () => 'defender_wins',
};
