import { maxUsableItemLevel, maxUsableScrollLevel } from '@site/src/utils/itemLevelLimits';
import { getRarityMultiplier } from '@site/src/utils/rarity';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import { PactId } from '../CharacterPlanner/PactDefinitions';
import { AppliedUpgrade, BaseStats, calculateCharacterStats, CharacterStats, EquippedItem, ItemSlotType, Upgrade } from '../CharacterPlanner/useCharacterState';
import { fightStatsFromCharacterStats } from '@site/src/services/combat/characterToCombatant';
import { estimateFight, expectedRoundDamage, PVP_ROUNDS, type FightStats } from '@site/src/services/combat/expectedOutcome';
import { calculateDamageBonus } from '../Grindstone';
import type { BaseItem, ItemRarity, PrefixSuffix } from '../Item';
import { calculateArmourBonus } from '../ProtectiveGear';

const SLOT_TYPE_MAP: Record<ItemSlotType, string[]> = {
  helmet: ['helmets'],
  amulet: ['amulets'],
  chest: ['armour'],
  gloves: ['gloves'],
  mainHand: ['weapons'],
  offHand: ['shields'],
  ring1: ['rings'],
  ring2: ['rings'],
  shoes: ['shoes'],
};

// Order in which slots are optimised (weapons first for damage-based scoring)
const SLOT_ORDER: ItemSlotType[] = ['mainHand', 'offHand', 'helmet', 'chest', 'gloves', 'shoes', 'amulet', 'ring1', 'ring2'];

// Slots that receive a Grindstone (damage) enchant
const WEAPON_ENCHANT_SLOTS = new Set<ItemSlotType>(['mainHand']);
// Slots that receive a Protective-gear (armour) enchant
const ARMOUR_ENCHANT_SLOTS = new Set<ItemSlotType>(['helmet', 'chest', 'gloves', 'shoes', 'offHand']);
// Slots that receive stat powder upgrades
const POWDER_SLOTS = new Set<ItemSlotType>(['ring1', 'ring2', 'amulet']);

// Synthetic powder Upgrade objects — one per toggleable stat.
// calculateCharacterStats reads only .type and .stat from an Upgrade, so the
// other fields are irrelevant for simulation purposes.
const STAT_POWDERS: Record<keyof PowderToggles, Upgrade> = {
  dexterity:    { name: 'Dexterity Powder',    type: 'powder', stat: 'dexterity',    applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
  agility:      { name: 'Agility Powder',      type: 'powder', stat: 'agility',      applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
  strength:     { name: 'Strength Powder',     type: 'powder', stat: 'strength',     applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
  intelligence: { name: 'Intelligence Powder', type: 'powder', stat: 'intelligence', applicableTo: ['rings', 'amulets'], permanent: false, description: '' },
};

// Affixes kept from each ranking (in-build and stand-alone), combined pairwise in the full search
const TOP_AFFIXES = 12;
// Safety cap on coordinate-descent passes; the search normally converges in 2–4
const MAX_PASSES = 8;
// Minimum score gain for a pairwise refit to count as an improvement (avoids float-noise loops)
const IMPROVEMENT_EPSILON = 1e-6;

/** Every combination of `size` distinct slots, in SLOT_ORDER order. */
function slotGroupsOfSize(size: number, from = 0): ItemSlotType[][] {
  if (size === 0) return [[]];
  return SLOT_ORDER.slice(from).flatMap((slot, offset) =>
    slotGroupsOfSize(size - 1, from + offset + 1).map(rest => [slot, ...rest]));
}

export interface SimulationWeights {
  critDamage: number;
  block: number;
  damage: number;
  armor: number;
}

/** Equal priorities — the score then tracks arena win chance against an equal opponent. */
export const DEFAULT_SIMULATION_WEIGHTS: SimulationWeights = {
  critDamage: 25,
  block: 25,
  damage: 25,
  armor: 25,
};

/** Which stat powders may be applied to rings and the amulet. */
export interface PowderToggles {
  dexterity: boolean;
  agility: boolean;
  strength: boolean;
  intelligence: boolean;
}

export interface SimulationInput {
  characterLevel: number;
  baseStats: BaseStats;
  activePacts: Set<PactId>;
  weights: SimulationWeights;
  powders: PowderToggles;
  evaluationRarity?: ItemRarity;
  weaponEnchantValue?: number;
  armourEnchantValue?: number;
  /** When set, the build is optimised for arena win chance against this opponent and `weights` are ignored. */
  opponent?: FightStats;
  /**
   * Highest item level to consider instead of the character's wear limit — e.g. for
   * Circus Turma, which has no wear limit, the highest level the player can obtain.
   * Affixes are then limited only by this item level.
   */
  maxItemLevel?: number;
}

export interface SimulationResult {
  build: Map<ItemSlotType, EquippedItem>;
  stats: CharacterStats;
  score: number;
  /** Estimated arena win chance (0..1) against the opponent, when one was given. */
  winChance?: number;
}

/** Default flat damage bonus from a Grindstone at the given scroll level and rarity. */
export function getDefaultWeaponEnchantValue(scrollLevel: number, rarity: ItemRarity): number {
  return calculateDamageBonus(scrollLevel, getRarityMultiplier(rarity));
}

/** Default flat armour bonus from a Protective Gear at the given scroll level and rarity. */
export function getDefaultArmourEnchantValue(scrollLevel: number, rarity: ItemRarity): number {
  return calculateArmourBonus(scrollLevel, getRarityMultiplier(rarity));
}

/**
 * Arena-calibrated value of each fight stat, in "1 % critical hit chance" units.
 *
 * Derived from the analytic fight model (estimateFight, which matches
 * simulateOddsPvP within ~0.5 pp) as the marginal win-chance gain per unit in
 * level-156 and level-159 mirror matches: 1 % crit ≈ +1 pp win chance there.
 * Damage, armour and primary stats grow with level, so their value per point
 * is scaled by 1 / level. Life points are worth nothing in a 15-round arena
 * fight unless someone can be killed, which is rare at equal levels.
 */
const ARENA_VALUE = {
  critChance: 1,
  blockChance: 0.8,
  critAvoidChance: 1,
  damagePerLevel: 17,       // per point of average damage, × 1/level
  armourPerLevel: 0.22,     // per point of armour, × 1/level
  hitStatPerLevel: 2.75,    // per point of Dexterity (hit chance) or Agility (dodge), × 1/level
  doubleHitStatPerLevel: 0.6, // per point of Charisma (own double hit) or Intelligence (opponent's), × 1/level
};

/**
 * Score a build for the user's priorities using arena-calibrated stat values.
 *
 * Each priority slider (0–100) multiplies the arena value of the stats it covers:
 *   Critical — critical hit chance
 *   Block    — block chance
 *   Damage   — average damage, hit chance (Dexterity), double hit (Charisma)
 *   Armour   — armour, crit avoidance (Resilience), dodge (Agility), Intelligence
 * With equal sliders the score tracks arena win chance against an equal opponent.
 */
function scoreForPriorities(stats: CharacterStats, weights: SimulationWeights, characterLevel: number): number {
  const perLevel = 1 / Math.max(1, characterLevel);
  const averageDamage = (stats.totalDamageMin + stats.totalDamageMax) / 2;

  const critical = stats.criticalHitChance * ARENA_VALUE.critChance;
  const block = stats.blockChance * ARENA_VALUE.blockChance;
  const offence =
    averageDamage * ARENA_VALUE.damagePerLevel * perLevel +
    stats.finalDexterity * ARENA_VALUE.hitStatPerLevel * perLevel +
    stats.finalCharisma * ARENA_VALUE.doubleHitStatPerLevel * perLevel;
  const defence =
    stats.totalArmor * ARENA_VALUE.armourPerLevel * perLevel +
    stats.critAvoidanceChance * ARENA_VALUE.critAvoidChance +
    stats.finalAgility * ARENA_VALUE.hitStatPerLevel * perLevel +
    stats.finalIntelligence * ARENA_VALUE.doubleHitStatPerLevel * perLevel;

  return (
    (weights.critDamage / 100) * critical +
    (weights.block      / 100) * block +
    (weights.damage     / 100) * offence +
    (weights.armor      / 100) * defence -
    knockoutRiskPenalty(stats)
  );
}

// Score lost when life points fall to zero against an equal opponent (comparable to a full priority)
const KNOCKOUT_PENALTY = 100;

/**
 * Life points barely matter in the arena only while they last the whole fight.
 * Penalise builds whose life points would not survive 15 rounds against their
 * own mirror image (mean damage taken plus three standard deviations).
 */
function knockoutRiskPenalty(stats: CharacterStats): number {
  const fight = fightStatsFromCharacterStats(stats);
  const damageTaken = expectedRoundDamage(fight, fight);
  const safeLifePoints = PVP_ROUNDS * damageTaken.mean + 3 * Math.sqrt(PVP_ROUNDS * damageTaken.variance);
  const shortfall = Math.max(0, safeLifePoints - stats.totalHealth);
  return KNOCKOUT_PENALTY * shortfall / Math.max(1, safeLifePoints);
}

/** Keep the `count` highest-scoring entries, best first. */
function topByScore<T>(entries: T[], scoreOf: (entry: T) => number, count: number): T[] {
  return entries
    .map(entry => ({ entry, score: scoreOf(entry) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ entry }) => entry);
}

function itemLevelOf(base: BaseItem, prefix?: PrefixSuffix, suffix?: PrefixSuffix): number {
  return base.level + (prefix?.level ?? 0) + (suffix?.level ?? 0);
}

export function runSimulation(input: SimulationInput): SimulationResult {
  const {
    characterLevel,
    baseStats,
    activePacts,
    weights,
    powders,
    evaluationRarity = 'red',
    weaponEnchantValue,
    armourEnchantValue,
    opponent,
    maxItemLevel,
  } = input;
  // Against a known opponent, rank builds by the fight's z-score: monotonic in
  // win chance but it keeps separating builds when the chance is near 0 or 1
  const scoreStats = (stats: CharacterStats): number => opponent
    ? estimateFight(fightStatsFromCharacterStats(stats), opponent).zScore
    : scoreForPriorities(stats, weights, characterLevel);
  const usableItemLevel = maxItemLevel ?? maxUsableItemLevel(characterLevel);
  const usableScrollLevel = maxItemLevel ?? maxUsableScrollLevel(characterLevel);
  const usablePrefixes = (prefixesData as PrefixSuffix[]).filter(prefix => prefix.level <= usableScrollLevel);
  const usableSuffixes = (suffixesData as PrefixSuffix[]).filter(suffix => suffix.level <= usableScrollLevel);

  const powderLevel = Math.floor(characterLevel / 5);
  const powderVariants: (AppliedUpgrade | undefined)[] = [
    undefined,
    ...(Object.keys(STAT_POWDERS) as (keyof PowderToggles)[])
      .filter(key => powders[key])
      .map(key => ({ upgrade: STAT_POWDERS[key], level: powderLevel })),
  ];

  const enchantValueFor = (slot: ItemSlotType): number | undefined => {
    if (WEAPON_ENCHANT_SLOTS.has(slot)) return weaponEnchantValue ?? getDefaultWeaponEnchantValue(characterLevel, evaluationRarity);
    if (ARMOUR_ENCHANT_SLOTS.has(slot)) return armourEnchantValue ?? getDefaultArmourEnchantValue(characterLevel, evaluationRarity);
    return undefined;
  };

  // Memoised so a given combination is always the same object, letting itemStatsCache hit
  const itemsByKey = new Map<string, EquippedItem>();
  const makeItem = (
    slot: ItemSlotType,
    baseItem: BaseItem,
    prefix?: PrefixSuffix,
    suffix?: PrefixSuffix,
    powder?: AppliedUpgrade,
  ): EquippedItem => {
    const key = `${slot}|${baseItem.id}|${prefix?.name ?? ''}|${suffix?.name ?? ''}|${powder?.upgrade.stat ?? ''}`;
    let item = itemsByKey.get(key);
    if (!item) {
      const enchantValue = enchantValueFor(slot);
      item = {
        baseItem,
        prefix,
        suffix,
        rarity: evaluationRarity,
        conditioned: true,
        ...(enchantValue !== undefined && { enchantValue }),
        ...(powder !== undefined && { upgrades: [powder] }),
      };
      itemsByKey.set(key, item);
    }
    return item;
  };

  // Against an opponent, start from the balanced priority build rather than an empty one.
  // Chances such as crit are worthless until they pass the opponent's avoidance, so
  // one-slot changes from an empty build cannot reach them; and since every step
  // below only accepts improvements, the result never scores worse than this seed.
  let currentBuild = opponent
    ? new Map(runSimulation({ ...input, opponent: undefined, weights: DEFAULT_SIMULATION_WEIGHTS }).build)
    : new Map<ItemSlotType, EquippedItem>();
  // Candidate items are never mutated, so their per-item stats can be reused across evaluations
  const itemStatsCache: Parameters<typeof calculateCharacterStats>[4] = new WeakMap();
  const statsOf = (build: Map<ItemSlotType, EquippedItem>) =>
    calculateCharacterStats(build, characterLevel, baseStats, activePacts, itemStatsCache);

  /** Score of the current build with `slot` replaced by `item`. */
  const scoreWith = (slot: ItemSlotType, item: EquippedItem): number => {
    // Swap in place rather than copying the build: this runs hundreds of thousands of times
    const previous = currentBuild.get(slot);
    currentBuild.set(slot, item);
    const score = scoreStats(statsOf(currentBuild));
    if (previous) currentBuild.set(slot, previous);
    else currentBuild.delete(slot);
    return score;
  };

  const basesBySlot = new Map(SLOT_ORDER.map(slot => [
    slot,
    (basesData as BaseItem[]).filter(b => SLOT_TYPE_MAP[slot].includes(b.type) && b.level <= Math.max(characterLevel, maxItemLevel ?? 0)),
  ]));

  const fitsLevelBudget = (base: BaseItem, prefix?: PrefixSuffix, suffix?: PrefixSuffix) =>
    itemLevelOf(base, prefix, suffix) <= usableItemLevel;

  /** Score of a build holding only `item` — an affix's value before other slots fill any caps. */
  const scoreAlone = (slot: ItemSlotType, item: EquippedItem): number =>
    scoreStats(statsOf(new Map([[slot, item]])));

  // Stand-alone rankings never change during the search, so rank once per slot.
  // A base's value is additive (base damage/armour on top of affix level scaling),
  // so for any affix pair the best base is simply the best-ranked one that fits.
  const candidatesBySlot = new Map(SLOT_ORDER.map(slot => {
    const bases = basesBySlot.get(slot) ?? [];
    const rankedBases = topByScore(bases, base => scoreAlone(slot, makeItem(slot, base)), bases.length);
    const bestBaseFor = (prefix?: PrefixSuffix, suffix?: PrefixSuffix) =>
      rankedBases.find(base => fitsLevelBudget(base, prefix, suffix));
    // Only affixes that fit on at least one base are worth considering
    const fittingPrefixes = usablePrefixes.filter(prefix => bestBaseFor(prefix));
    const fittingSuffixes = usableSuffixes.filter(suffix => bestBaseFor(undefined, suffix));
    return [slot, {
      bestBaseFor,
      fittingPrefixes,
      fittingSuffixes,
      standalonePrefixes: topByScore(
        fittingPrefixes,
        prefix => scoreAlone(slot, makeItem(slot, bestBaseFor(prefix)!, prefix)),
        TOP_AFFIXES,
      ),
      standaloneSuffixes: topByScore(
        fittingSuffixes,
        suffix => scoreAlone(slot, makeItem(slot, bestBaseFor(undefined, suffix)!, undefined, suffix)),
        TOP_AFFIXES,
      ),
    }];
  }));

  /**
   * Find the best item for one slot given every other slot in the current build.
   *
   * Candidate affixes come from two exact rankings (via calculateCharacterStats,
   * so percent stats and caps are handled): their marginal value in the current
   * build, and their stand-alone value. The second keeps affixes in play whose
   * stats are currently capped by other slots, so the search can move those
   * stats between slots. The candidates are then combined exhaustively within
   * the item-level budget.
   */
  const optimiseSlot = (slot: ItemSlotType): EquippedItem | undefined => {
    const candidates = candidatesBySlot.get(slot)!;
    const current = currentBuild.get(slot);
    const currentPowder = current?.upgrades?.[0];
    const itemFor = (prefix?: PrefixSuffix, suffix?: PrefixSuffix) => {
      const base = candidates.bestBaseFor(prefix, suffix);
      return base && makeItem(slot, base, prefix, suffix, currentPowder);
    };

    // Rank each affix alongside the slot's current partner affix (dropped if the pair no longer fits)
    const contextualPrefixes = topByScore(
      candidates.fittingPrefixes,
      prefix => scoreWith(slot, (itemFor(prefix, current?.suffix) ?? itemFor(prefix))!),
      TOP_AFFIXES,
    );
    const contextualSuffixes = topByScore(
      candidates.fittingSuffixes,
      suffix => scoreWith(slot, (itemFor(current?.prefix, suffix) ?? itemFor(undefined, suffix))!),
      TOP_AFFIXES,
    );

    const topPrefixes = [...new Set([...contextualPrefixes, ...candidates.standalonePrefixes])];
    const topSuffixes = [...new Set([...contextualSuffixes, ...candidates.standaloneSuffixes])];

    // Start from the current item so a slot can never get worse
    let bestItem = current;
    let bestScore = current ? scoreWith(slot, current) : -Infinity;
    const consider = (candidate: EquippedItem) => {
      const score = scoreWith(slot, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestItem = candidate;
      }
    };

    // A powder can offset an affix's stat penalty, so powder and affixes are searched together
    const powdersToTry = POWDER_SLOTS.has(slot) ? powderVariants : [undefined];
    for (const powder of powdersToTry) {
      for (const prefix of [undefined, ...topPrefixes]) {
        for (const suffix of [undefined, ...topSuffixes]) {
          const base = candidates.bestBaseFor(prefix, suffix);
          if (base) consider(makeItem(slot, base, prefix, suffix, powder));
        }
      }
    }

    return bestItem;
  };

  /** Coordinate descent: re-optimise each slot against the rest until no slot changes. */
  const descend = () => {
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      let changed = false;
      for (const slot of SLOT_ORDER) {
        const best = optimiseSlot(slot);
        if (best && currentBuild.get(slot) !== best) {
          currentBuild.set(slot, best);
          changed = true;
        }
      }
      if (!changed) break;
    }
  };

  const buildScore = () => scoreStats(statsOf(currentBuild));

  /** Clear a group of slots and refit them against the rest; keep the result only if the build scores higher. */
  const refitSlots = (slots: ItemSlotType[]): boolean => {
    const before = new Map(currentBuild);
    const scoreBefore = buildScore();
    for (const slot of slots) currentBuild.delete(slot);
    for (let pass = 0; pass < 2; pass++) {
      for (const slot of slots) {
        const best = optimiseSlot(slot);
        if (best) currentBuild.set(slot, best);
      }
    }
    if (buildScore() > scoreBefore + IMPROVEMENT_EPSILON) return true;
    currentBuild = before;
    return false;
  };

  // Single-slot descent gets stuck once stat/chance caps are filled: moving a
  // capped stat from one slot to another needs several slots to change together.
  // Refit every pair until none helps, then every triple once; whenever a refit
  // helps, descend again.
  descend();
  const slotPairs = slotGroupsOfSize(2);
  for (let round = 0; round < MAX_PASSES; round++) {
    let improved = false;
    for (const pair of slotPairs) {
      if (refitSlots(pair)) {
        descend();
        improved = true;
      }
    }
    if (!improved) break;
  }
  for (const triple of slotGroupsOfSize(3)) {
    if (refitSlots(triple)) descend();
  }

  const finalStats = calculateCharacterStats(currentBuild, characterLevel, baseStats, activePacts);
  return {
    build: currentBuild,
    stats: finalStats,
    score: scoreStats(finalStats),
    ...(opponent && { winChance: estimateFight(fightStatsFromCharacterStats(finalStats), opponent).winChance }),
  };
}
