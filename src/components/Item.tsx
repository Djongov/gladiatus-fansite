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
  damageScrollMultiplier?: number; // Weapon-specific multiplier for flat damage bonuses (e.g., 4 for short dagger)
  damageMinConstant?: number; // Weapon-specific constant for min damage formula (e.g., 8 for short dagger)
  damageMaxConstant?: number; // Weapon-specific constant for max damage formula (e.g., 20 for short dagger)
  armour?: number | null;
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
  armour?: number;
  prefixArmor: number;
  prefixHealth: number;
  prefixDamage: number;
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

  // Calculate final level (base + prefix + suffix)
  const finalLevel = (baseItem.level || 0) + (prefix?.level || 0) + (suffix?.level || 0);

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

  // Calculate damage (if weapon) - using Gladiatus damage formulas
  let damage: { min: number; max: number } | undefined;
  if (baseItem.damageMin !== undefined && baseItem.damageMax !== undefined) {
    // Get flat damage from prefix ONLY (suffix flat damage is ignored in formulas)
    const damageFromScroll = prefix?.stats?.damage?.flat || 0;
    
    // Check if we have prefix/suffix that adds levels
    const hasPrefixOrSuffix = prefix || suffix;
    
    let finalMinDamage: number;
    let finalMaxDamage: number;
    
    if (hasPrefixOrSuffix) {
      // Use Gladiatus formula for weapons with prefix/suffix
      // levelMultiplier = prefixLevel + suffixLevel + 1 (weapon base level NOT included)
      const levelMultiplier = (prefix?.level || 0) + (suffix?.level || 0) + 1;
      const rarityMultiplier = getDamageMultiplier();
      
      // Min damage formula: ROUNDUP((baseMin + (levelMultiplier - 1 + FLOOR((levelMultiplier-1)/5)) - 1) + 2*damageFromScroll) + 1
      // Then multiply by rarity
      const levelScaling = levelMultiplier - 1 + Math.floor((levelMultiplier - 1) / 5);
      const baseMinDamage = Math.ceil((baseItem.damageMin + (levelScaling - 1)) + 2 * damageFromScroll) + 1;
      finalMinDamage = Math.floor(baseMinDamage * rarityMultiplier);
      
      // Max damage formula: (rarityMultiplier*FLOOR(levelMultiplier/2) + 2*FLOOR((levelMultiplier-1)/2) + baseMax) + 2*damageFromScroll
      // Then multiply entire result by rarity
      const baseMaxCalc = (Math.floor(levelMultiplier / 2) + 2 * Math.floor((levelMultiplier - 1) / 2) + baseItem.damageMax) + 2 * damageFromScroll;
      finalMaxDamage = Math.floor(baseMaxCalc * rarityMultiplier);
    } else {
      // No prefix/suffix: use base damage from JSON and apply rarity multiplier
      const multiplier = getDamageMultiplier();
      finalMinDamage = Math.floor(baseItem.damageMin * multiplier);
      finalMaxDamage = Math.floor(baseItem.damageMax * multiplier);
    }
    
    damage = {
      min: finalMinDamage,
      max: finalMaxDamage,
    };
  }

  // Calculate armour (if armor/helmet/gloves/shoes)
  let armour: number | undefined;
  if (baseItem.armour !== null && baseItem.armour !== undefined) {
    // Check if we have prefix/suffix that adds levels
    const hasPrefixOrSuffix = prefix || suffix;
    
    if (hasPrefixOrSuffix) {
      // Use Gladiatus formula for armor with prefix/suffix
      // levelMultiplier = prefixLevel + suffixLevel + 1 (armor base level NOT included)
      const levelMultiplier = (prefix?.level || 0) + (suffix?.level || 0) + 1;
      const rarityMultiplier = getDamageMultiplier();
      const prefixLevel = prefix?.level || 0;
      const suffixLevel = suffix?.level || 0;
      
      // Armor formula: baseArmor + (10 + prefixLevel/20 + suffixLevel/20) * (levelMultiplier - 1)
      // The multiplier scales with both prefix and suffix levels
      const armorMultiplier = 10 + (prefixLevel / 20) + (suffixLevel / 20);
      const calculatedArmor = baseItem.armour + armorMultiplier * (levelMultiplier - 1);
      
      // Floor the calculated armor first
      const flooredCalculated = Math.floor(calculatedArmor);
      
      // Add flat armor from prefix/suffix AFTER flooring
      const rawFlatArmor = ((prefix?.stats?.armor?.flat || 0) + (suffix?.stats?.armor?.flat || 0));
      const totalBaseArmor = flooredCalculated + rawFlatArmor;
      
      // Then multiply by rarity and floor again
      armour = Math.floor(totalBaseArmor * rarityMultiplier);
    } else {
      // No prefix/suffix: use base armor from JSON and apply rarity multiplier
      const multiplier = getDamageMultiplier();
      armour = Math.floor(baseItem.armour * multiplier);
    }
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

  // Extract armor, health, and damage for separate display (shown before regular stats)
  const prefixArmor = statsMap['armor']?.flat || 0;
  const prefixHealth = statsMap['health']?.flat || 0;
  const prefixDamage = statsMap['damage']?.flat || 0;
  
  // Define slot-specific stat restrictions (percentage stats only)
  const restrictedPercentStats: Record<string, string[]> = {
    shields: ['charisma'],
    armour: ['agility'],
    shoes: ['dexterity'],
    rings: ['strength'],
    amulets: ['strength']
  };
  
  const restrictedStats = restrictedPercentStats[baseItem.type] || [];
  
  // Filter out restricted percentage stats for this item type
  Object.keys(statsMap).forEach(stat => {
    if (restrictedStats.includes(stat) && statsMap[stat].percent !== 0) {
      // Remove the percentage part of restricted stats
      statsMap[stat].percent = 0;
      // If both flat and percent are now 0, we can remove the stat entirely
      if (statsMap[stat].flat === 0) {
        delete statsMap[stat];
      }
    }
  });
  
  // Convert to array format - flat and percent for same stat appear consecutively
  const stats: Array<{ name: string; flat: number; percent: number }> = [];
  
  // Define stat order as in-game: Damage first, then Strength, Dexterity, Agility, Constitution, Charisma, Intelligence, then others
  const statOrder = ['damage', 'strength', 'dexterity', 'agility', 'constitution', 'charisma', 'intelligence', 
                     'critical_hit', 'double_hit', 'avoid_critical_hit', 'avoid_double_hit', 
                     'block_chance', 'healing'];
  
  // Sort stats by predefined order
  const sortedStats = Object.entries(statsMap)
    .filter(([stat]) => {
      // Always exclude health and damage (shown separately)
      if (stat === 'health' || stat === 'damage') return false;
      // Only exclude armor if the item has base armor (armor pieces)
      // For weapons/jewelry, armor from prefix/suffix should be shown in stats
      if (stat === 'armor' && baseItem.armour !== null && baseItem.armour !== undefined) return false;
      return true;
    })
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

  // Calculate total gold value (uses same multipliers as damage)
  const goldMultiplier = getDamageMultiplier();
  const baseGold = baseItem.gold ? Math.round(baseItem.gold * goldMultiplier) : 0;
  const totalGold = baseGold + (prefix?.gold || 0) + (suffix?.gold || 0);

  return {
    name: fullName,
    level: finalLevel,
    rarity,
    damage,
    armour,
    prefixArmor,
    prefixHealth,    prefixDamage,    durability: applyBonus(baseItem.durability) || undefined,
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
            <div>Damage {calculatedStats.damage.min} - {calculatedStats.damage.max}</div>
          )}
          
          {calculatedStats.prefixDamage !== 0 && (
            <div>Damage {calculatedStats.prefixDamage > 0 ? '+' : ''}{calculatedStats.prefixDamage}</div>
          )}
          
          {calculatedStats.armour && <div>Armour {calculatedStats.armour > 0 ? '+' : ''}{calculatedStats.armour}</div>}
          
          {calculatedStats.prefixHealth !== 0 && (
            <div>Health {calculatedStats.prefixHealth > 0 ? '+' : ''}{calculatedStats.prefixHealth}</div>
          )}

          {/* Display stats from prefix/suffix */}
          {calculatedStats.stats.length > 0 && calculatedStats.stats.map((stat, index) => (
            <div key={`${stat.name}-${index}`}>
              {stat.name}
              {stat.flat !== 0 && ` ${stat.flat > 0 ? '+' : ''}${stat.flat}`}
              {stat.percent !== 0 && ` ${stat.percent > 0 ? '+' : ''}${stat.percent}%`}
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
