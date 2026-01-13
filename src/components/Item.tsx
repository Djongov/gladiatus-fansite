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

  // Damage uses flat additions from rarity, then scales dramatically with level when affixes present
  const getDamageBonus = (): { minBonus: number; maxBonus: number } => {
    // Calculate effective tier (rarity + conditioning)
    const tierMap: Record<ItemRarity, number> = {
      common: 0,
      green: 0,
      blue: 1,
      purple: 2,
      orange: 3,
      red: 4,
    };
    
    let effectiveTier = tierMap[rarity];
    if (conditioned) effectiveTier += 1;
    
    // Calculate base damage range
    const damageRange = baseItem.damageMax !== undefined && baseItem.damageMin !== undefined
      ? baseItem.damageMax - baseItem.damageMin
      : 0;
    
    // Base bonuses for small ranges (1-2)
    let minBonus = 0;
    let maxBonus = 0;
    
    switch (effectiveTier) {
      case 0: // common/green
        minBonus = 0; maxBonus = 0;
        break;
      case 1: // blue
        minBonus = 0; maxBonus = 1;
        break;
      case 2: // purple
        minBonus = 0; maxBonus = 1;
        break;
      case 3: // orange
        minBonus = 1; maxBonus = 2;
        break;
      case 4: // red
        minBonus = 2; maxBonus = 3;
        break;
      case 5: // red+conditioned
        minBonus = 3; maxBonus = 4;
        break;
    }
    
    // Scale bonuses based on damage range
    if (damageRange >= 3) {
      if (effectiveTier === 2) {
        maxBonus = damageRange >= 5 ? 2 : 1;
      }
      if (effectiveTier === 3) {
        maxBonus = 2 + Math.floor(damageRange / 2);
      }
      if (effectiveTier === 4) {
        if (damageRange <= 2) {
          maxBonus = 3;
        } else if (damageRange === 3) {
          maxBonus = 3;
        } else if (damageRange === 5) {
          maxBonus = 5;
        } else if (damageRange >= 7) {
          maxBonus = 6;
        }
        minBonus = damageRange >= 5 ? 1 : 2;
      }
      if (effectiveTier === 5) {
        if (damageRange === 3) {
          maxBonus = 5;
          minBonus = 2;
        } else if (damageRange === 5) {
          maxBonus = 7;
          minBonus = 2;
        } else if (damageRange >= 7) {
          maxBonus = 9;
          minBonus = 2;
        }
      }
    }
    
    return { minBonus, maxBonus };
  };

  // Build full item name
  const fullName = [prefix?.name, baseItem.name, suffix?.name].filter(Boolean).join(' ');

  // Calculate damage (if weapon)
  let damage: { min: number; max: number } | undefined;
  if (baseItem.damageMin !== undefined && baseItem.damageMax !== undefined) {
    const damageBonus = getDamageBonus();
    
    // Get flat damage bonuses from prefix/suffix
    const prefixDamage = prefix?.stats?.damage?.flat || 0;
    const suffixDamage = suffix?.stats?.damage?.flat || 0;
    
    let baseDamageMin = baseItem.damageMin + damageBonus.minBonus;
    let baseDamageMax = baseItem.damageMax + damageBonus.maxBonus;
    
    // If affixes are present, apply level scaling
    // From live data: base 4-12 at level 4 -> 352-428 at level 117 (with +20 flat from affixes)
    // So scaled damage is: 332-408, ratios are 332/4 = 83x and 408/12 = 34x
    // This is roughly (level^2 / baseLevel) for min, (level * 3) for max
    if (prefix || suffix) {
      const baseLevel = baseItem.level || 1;
      const levelRatio = finalLevel / baseLevel; // 117/4 = 29.25
      
      // Min damage scales more aggressively: approximately levelRatio^1.5
      // Max damage scales moderately: approximately levelRatio^1.1
      const minScaleFactor = Math.pow(levelRatio, 1.5);
      const maxScaleFactor = Math.pow(levelRatio, 1.1);
      
      baseDamageMin = Math.round(baseDamageMin * minScaleFactor);
      baseDamageMax = Math.round(baseDamageMax * maxScaleFactor);
    }
    
    damage = {
      min: baseDamageMin + prefixDamage + suffixDamage,
      max: baseDamageMax + prefixDamage + suffixDamage,
    };
  }

  // Calculate armor (uses multiplier for base, flat bonus from prefix/suffix)
  let armor: number | undefined;
  if (baseItem.armor !== null && baseItem.armor !== undefined) {
    const prefixArmor = prefix?.stats?.armor?.flat || 0;
    const suffixArmor = suffix?.stats?.armor?.flat || 0;
    let baseArmor = applyBonus(baseItem.armor)!;
    
    // Apply level scaling if affixes present
    if (prefix || suffix) {
      const baseLevel = baseItem.level || 1;
      const levelScaleFactor = finalLevel / baseLevel;
      baseArmor = Math.round(baseArmor * levelScaleFactor);
    }
    
    armor = baseArmor + prefixArmor + suffixArmor;
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

  // Convert to array format - create separate entries for flat and percent
  const stats: Array<{ name: string; flat: number; percent: number }> = [];
  
  Object.entries(statsMap)
    .filter(([stat]) => stat !== 'damage' && stat !== 'armor') // Exclude damage/armor as they're shown separately
    .forEach(([name, value]) => {
      const formattedName = name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Add flat stat line if non-zero
      if (value.flat !== 0) {
        stats.push({ name: formattedName, flat: value.flat, percent: 0 });
      }
      
      // Add percent stat line if non-zero
      if (value.percent !== 0) {
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

          {resolvedBaseItem.type && <div className={styles.type}>Type: {resolvedBaseItem.type}</div>}

          {calculatedStats.damage && (
            <div>Damage: {calculatedStats.damage.min} - {calculatedStats.damage.max}</div>
          )}
          
          {calculatedStats.armor && <div>Armor: {calculatedStats.armor}</div>}

          {calculatedStats.durability && (
            <div>Durability: {calculatedStats.durability}</div>
          )}

          {calculatedStats.conditioning.max > 0 && (
            <div>
              Conditioning: {calculatedStats.conditioning.current} / {calculatedStats.conditioning.max}
            </div>
          )}

          {/* Display stats from prefix/suffix */}
          {calculatedStats.stats.length > 0 && (
            <div className={styles.statsSection}>
              {calculatedStats.stats.map((stat, index) => (
                <div key={`${stat.name}-${index}`} className={styles.statLine}>
                  {stat.name}
                  {stat.flat !== 0 && ` +${stat.flat}`}
                  {stat.percent !== 0 && ` +${stat.percent}%`}
                </div>
              ))}
            </div>
          )}

          {enchantValue && (
            <div className={styles.enchant}>+{enchantValue} Damage</div>
          )}

          {materialsText.length > 0 && (
            <div className={styles.materials}>
              <div>Materials:</div>
              {materialsText.map((mat, i) => (
                <div key={i} className={styles.materialItem}>• {mat}</div>
              ))}
            </div>
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

          {/* Show multiplier info for debugging/transparency */}
          {effectiveRarity !== 'common' || conditioned ? (
            <div className={styles.multiplierInfo}>
              Bonus: ×{calculatedStats.bonusMultiplier.toFixed(2)}
            </div>
          ) : null}
        </span>
      )}
    </span>
  );
}
