import React from 'react';
import styles from '@site/src/css/ItemTooltip.module.css';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';

// Base item type from bases.json
export interface BaseItem {
  name: string;
  type: 'weapons' | 'shields' | 'armor' | 'helmets' | 'gloves' | 'shoes' | 'rings' | 'amulets';
  level: number | null;
  damageMin?: number;
  damageMax?: number;
  armor?: number | null;
  durability: number | null;
  conditioning: number | null;
  gold: number | null;
  image: string;
  materials: Record<string, number>;
}

// Prefix/Suffix will have stats that modify the base item
export interface PrefixSuffix {
  name: string;
  level: number;
  gold: number;
  stats: Record<string, { flat: number; percent: number }>;
  materials: Record<string, number>;
}

export type ItemRarity = 'common' | 'green' | 'blue' | 'purple' | 'orange' | 'red';

// Calculated item stats - useful for character planner
export interface CalculatedItemStats {
  name: string;
  level: number;
  rarity: ItemRarity;
  damage?: { min: number; max: number };
  armor?: number;
  durability?: number;
  conditioning: { current: number; max: number };
  gold?: number;
  stats: Array<{ name: string; flat: number; percent: number }>; // Combined stats from prefix/suffix
  bonusMultiplier: number; // Total multiplier applied
}

interface ItemProps {
  baseItem: string | BaseItem; // Can be item name or item object
  prefix?: string | PrefixSuffix;
  suffix?: string | PrefixSuffix;
  rarity?: ItemRarity; // Optional override, auto-detected if not provided
  conditioned?: boolean;
  enchantValue?: number;
  hideTooltip?: boolean; // For character planner - just show icon
}

/**
 * Calculate all item stats based on base item, rarity, and conditioning
 * This function is exported for use in character planners and other tools
 */
export function calculateItemStats(
  baseItem: BaseItem,
  rarity: ItemRarity,
  conditioned: boolean,
  prefix?: PrefixSuffix,
  suffix?: PrefixSuffix
): CalculatedItemStats {
  // Calculate stat multipliers based on actual game formulas
  // Each rarity tier adds ×0.5 multiplier to durability/conditioning
  // Conditioning adds another ×0.5 (equivalent to going up one rarity tier)
  const rarityMultipliers: Record<ItemRarity, number> = {
    common: 1.0,
    green: 1.0,
    blue: 1.5,
    purple: 2.5,
    orange: 3.0,
    red: 3.5,
  };

  // Get base multiplier for this rarity
  let totalMultiplier = rarityMultipliers[rarity];
  
  // Conditioning adds 0.5 more (moves up one tier)
  if (conditioned) {
    totalMultiplier += 0.5;
  }

  // Apply multipliers to durability/conditioning/gold
  const applyBonus = (value: number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    return Math.round(value * totalMultiplier);
  };

  // Calculate final level (base + prefix + suffix + 1 for rounding)
  const finalLevel = (baseItem.level || 0) + (prefix?.level || 0) + (suffix?.level || 0) + 1;

  // Get damage multiplier based on rarity and conditioning
  const getDamageMultiplier = (): number => {
    // Conditioning bumps item to next tier: green+ = blue, blue+ = purple, etc.
    // Based on Gameforge formula (actual percentages from game):
    // Green (Ceres) = 100% base
    // Blue (Neptune) = 115%
    // Purple (Mars) = 130%
    // Orange (Jupiter) = 150%
    // Red (Vulcan) = 175%
    // Red+ = 200% (2× green)
    
    // Determine effective rarity with conditioning
    let effectiveRarity = rarity;
    if (conditioned) {
      switch (rarity) {
        case 'green':
          effectiveRarity = 'blue';
          break;
        case 'blue':
          effectiveRarity = 'purple';
          break;
        case 'purple':
          effectiveRarity = 'orange';
          break;
        case 'orange':
          effectiveRarity = 'red';
          break;
        // red+ needs special handling below
      }
    }
    
    switch (effectiveRarity) {
      case 'common':
      case 'green':
        return 1.0; // 100%
      case 'blue':
        return 1.15; // 115%
      case 'purple':
        return 1.30; // 130%
      case 'orange':
        return 1.50; // 150%
      case 'red':
        if (conditioned && rarity === 'red') {
          // Red+ = 200%
          return 2.0;
        }
        return 1.75; // 175%
      default:
        return 1.0;
    }
  };

  // Build full item name
  const fullName = [prefix?.name, baseItem.name, suffix?.name].filter(Boolean).join(' ');

  // Calculate damage (if weapon) - base items with rarity scaling
  let damage: { min: number; max: number } | undefined;
  if (baseItem.damageMin !== undefined && baseItem.damageMax !== undefined) {
    const multiplier = getDamageMultiplier();
    
    // Gameforge uses floor (round down) for damage calculations
    damage = {
      min: Math.floor(baseItem.damageMin * multiplier),
      max: Math.floor(baseItem.damageMax * multiplier),
    };
  }

  // Calculate armor (base items only for now)
  let armor: number | undefined;
  if (baseItem.armor !== null && baseItem.armor !== undefined) {
    armor = applyBonus(baseItem.armor) || undefined;
  }

  // Combine stats from prefix and suffix
  const statsMap: Record<string, { flat: number; percent: number }> = {};
  
  if (prefix?.stats) {
    Object.entries(prefix.stats).forEach(([stat, value]) => {
      if (!statsMap[stat]) {
        statsMap[stat] = { flat: 0, percent: 0 };
      }
      statsMap[stat].flat += value.flat;
      statsMap[stat].percent += value.percent;
    });
  }
  
  if (suffix?.stats) {
    Object.entries(suffix.stats).forEach(([stat, value]) => {
      if (!statsMap[stat]) {
        statsMap[stat] = { flat: 0, percent: 0 };
      }
      statsMap[stat].flat += value.flat;
      statsMap[stat].percent += value.percent;
    });
  }

  // Apply rarity scaling to prefix/suffix stats
  // Stats scale with rarity: green=1.0x, orange=1.5x, red+=2.0x
  // Formula: max(1.0, totalMultiplier / 2)
  if (prefix || suffix) {
    const statMultiplier = Math.max(1.0, totalMultiplier / 2);
    
    Object.keys(statsMap).forEach(stat => {
      if (statsMap[stat].flat !== 0) {
        statsMap[stat].flat = Math.round(statsMap[stat].flat * statMultiplier);
      }
      if (statsMap[stat].percent !== 0) {
        statsMap[stat].percent = Math.round(statsMap[stat].percent * statMultiplier);
      }
    });
  }

  // Convert to array format - flat and percent for same stat appear consecutively
  const stats: Array<{ name: string; flat: number; percent: number }> = [];
  
  // Define stat order as in-game: Strength, Dexterity, Agility, Charisma, Intelligence, then others
  const statOrder = ['strength', 'dexterity', 'agility', 'charisma', 'intelligence', 'constitution', 
                     'critical_hit', 'double_hit', 'avoid_critical_hit', 'avoid_double_hit', 
                     'block_chance', 'healing'];
  
  // Sort stats by predefined order
  const sortedStats = Object.entries(statsMap)
    .filter(([stat]) => stat !== 'damage' && stat !== 'armor') // Exclude damage/armor as they're shown separately
    .sort(([a], [b]) => {
      const indexA = statOrder.indexOf(a);
      const indexB = statOrder.indexOf(b);
      // If both are in order list, compare positions
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // If only A is in list, it comes first
      if (indexA !== -1) return -1;
      // If only B is in list, it comes first
      if (indexB !== -1) return 1;
      // Neither in list, maintain original order
      return 0;
    });
  
  sortedStats.forEach(([name, value]) => {
    const formattedName = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Add both flat and percent for this stat, keeping them together
    if (value.flat !== 0 && value.percent !== 0) {
      // Both exist - add them together
      stats.push({ name: formattedName, flat: value.flat, percent: 0 });
      stats.push({ name: formattedName, flat: 0, percent: value.percent });
    } else if (value.flat !== 0) {
      // Only flat
      stats.push({ name: formattedName, flat: value.flat, percent: 0 });
    } else if (value.percent !== 0) {
      // Only percent
      stats.push({ name: formattedName, flat: 0, percent: value.percent });
    }
  });

  // Calculate total gold value
  const totalGold = (applyBonus(baseItem.gold) || 0) + (prefix?.gold || 0) + (suffix?.gold || 0);

  return {
    name: fullName,
    level: finalLevel,
    rarity,
    damage,
    armor,
    durability: applyBonus(baseItem.durability) || undefined,
    conditioning: {
      current: conditioned && baseItem.conditioning ? applyBonus(baseItem.conditioning)! : 0,
      max: applyBonus(baseItem.conditioning) || 0,
    },
    gold: totalGold || undefined,
    stats,
    bonusMultiplier: totalMultiplier,
  };
}

/**
 * Item component - displays an item with tooltip based on base item + modifiers
 */
export default function Item({
  baseItem,
  prefix,
  suffix,
  rarity,
  conditioned = false,
  enchantValue,
  hideTooltip = false,
}: ItemProps) {
  // Resolve base item if it's a string
  const resolvedBaseItem: BaseItem | null = typeof baseItem === 'string'
    ? (basesData as BaseItem[]).find(item => item.name === baseItem) || null
    : baseItem;

  if (!resolvedBaseItem) {
    return <span style={{ color: 'red' }}>Item not found: {typeof baseItem === 'string' ? baseItem : 'unknown'}</span>;
  }

  // Resolve prefix if it's a string
  const resolvedPrefix: PrefixSuffix | undefined = typeof prefix === 'string'
    ? (prefixesData as PrefixSuffix[]).find(p => p.name === prefix)
    : prefix;

  // Resolve suffix if it's a string
  const resolvedSuffix: PrefixSuffix | undefined = typeof suffix === 'string'
    ? (suffixesData as PrefixSuffix[]).find(s => s.name === suffix)
    : suffix;

  // Auto-detect rarity if not provided
  const effectiveRarity: ItemRarity = rarity || (resolvedPrefix || resolvedSuffix ? 'green' : 'common');

  // Calculate all stats
  const calculatedStats = calculateItemStats(
    resolvedBaseItem,
    effectiveRarity,
    conditioned,
    resolvedPrefix,
    resolvedSuffix
  );

  // Format materials
  const materialsText = Object.entries(resolvedBaseItem.materials).map(
    ([material, quantity]) => `${material}: ${quantity}`
  );

  return (
    <span className={styles.wrapper}>
      <img src={resolvedBaseItem.image} className={styles.icon} alt={calculatedStats.name} />

      {!hideTooltip && (
        <span className={styles.tooltip}>
          <div className={`${styles.title} ${styles[effectiveRarity]}`}>
            {calculatedStats.name}
          </div>

          {calculatedStats.damage && (
            <div>Damage: {calculatedStats.damage.min} - {calculatedStats.damage.max}</div>
          )}
          
          {calculatedStats.armor && <div>Armor: {calculatedStats.armor}</div>}

          {/* Display stats from prefix/suffix */}
          {calculatedStats.stats.length > 0 && calculatedStats.stats.map((stat, index) => (
            <div key={`${stat.name}-${index}`}>
              {stat.name}
              {stat.flat !== 0 && ` +${stat.flat}`}
              {stat.percent !== 0 && ` +${stat.percent}%`}
            </div>
          ))}

          {enchantValue && (
            <div className={styles.enchant}>+{enchantValue} Damage</div>
          )}

          <div className={styles.level}>Level {calculatedStats.level}</div>
          
          {calculatedStats.gold && (
            <div className={styles.gold}>
              Value {calculatedStats.gold.toLocaleString()}{' '}
              <img
                src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif"
                alt="Gold"
              />
            </div>
          )}

          {calculatedStats.durability && (
            <div className={styles.statLine}>
              Durability {calculatedStats.durability}/{calculatedStats.durability}
            </div>
          )}

          {calculatedStats.conditioning.max > 0 && (
            <div className={calculatedStats.conditioning.current > 0 ? styles.conditioned : styles.level}>
              Conditioning {calculatedStats.conditioning.current}/{calculatedStats.conditioning.max}
            </div>
          )}
        </span>
      )}
    </span>
  );
}
