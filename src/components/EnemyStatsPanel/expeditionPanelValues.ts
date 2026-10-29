import { ATTRIBUTE_KEYS, type AttributeKey } from '@site/src/components/CharacterPlanner/turmaTypes';
import { expeditionBlockChance, expeditionCritChance } from '@site/src/services/combat/enemyToCombatant';
import type { Enemy, Range } from '@site/src/types/expeditions';
import type { EnemyPanelValues } from './EnemyStatsPanel';

const MISSING_VALUE = '—';

/** "12" for a single value, "12-15" for a range */
export function formatRange(range: Range): string {
  return range.min === range.max ? String(range.min) : `${range.min}-${range.max}`;
}

// Same rounding as the Character Planner's stats panel
const formatChanceRange = (min: number, max: number): string => {
  const [low, high] = [Math.ceil(min), Math.ceil(max)];
  return low === high ? `${low}%` : `${low}%-${high}%`;
};

/**
 * The damage tooltip at the lowest level, then at the highest ("A-B/C-D"); a
 * single-level enemy has just one ("A-B"). See rollEnemyAsCombatant for the shape.
 */
function formatDamage(enemy: Enemy): string {
  const { min, max } = enemy.damage;
  if (enemy.level.min === enemy.level.max) return `${min.min}-${max.min}`;
  return `${min.min}-${min.max}/${max.min}-${max.max}`;
}

/** An expedition enemy's panel, with the chances the simulator fights it with. */
export function expeditionPanelValues(enemy: Enemy): EnemyPanelValues {
  const crit = expeditionCritChance(enemy.critRaw);
  return {
    life: enemy.life ? formatRange(enemy.life) : MISSING_VALUE,
    attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, formatRange(enemy[key])])) as Record<AttributeKey, string>,
    armour: formatRange(enemy.armour),
    damage: formatDamage(enemy),
    critChance: formatChanceRange(crit, crit),
    blockChance: formatChanceRange(
      expeditionBlockChance(enemy.blockRaw, enemy.strength.min, enemy.level.min),
      expeditionBlockChance(enemy.blockRaw, enemy.strength.max, enemy.level.max),
    ),
    // Expedition mobs never avoid crits (enemyToCombatant)
    critAvoidChance: '0%',
  };
}
