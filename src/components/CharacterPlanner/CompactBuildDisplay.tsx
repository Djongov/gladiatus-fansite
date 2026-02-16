import React, { useMemo } from 'react';
import styles from './CompactBuildDisplay.module.css';
import ItemSlot from './ItemSlot';
import { ItemSlotType, EquippedItem, BaseStats, CharacterStats } from './useCharacterState';
import { calculateItemStats } from '../Item';

interface CompactBuildDisplayProps {
  /** Full query string from character planner URL (RECOMMENDED - simplest method)
   * Example: "build=eyJoZWxtZXQ...&level=100&stats=eyJzdHJlbmd0aCI6MTQ0..."
   * Just copy everything after the ? in the character planner URL
   */
  readonly query?: string;
  /** Encoded build string from URL query params (alternative method) */
  readonly build?: string;
  /** Character level (required if using build string) */
  readonly level?: number | string;
  /** Encoded stats string from URL query params (optional) */
  readonly stats?: string;
  /** Build data - if not provided, will load from URL params or build/level/stats props */
  readonly buildData?: {
    items: Map<ItemSlotType, EquippedItem>;
    level: number;
    baseStats: BaseStats;
    title?: string;
    description?: string;
  };
  /** Whether to show a link to open in full planner */
  readonly showPlannerLink?: boolean;
  /** Custom title for the build */
  readonly title?: string;
  /** Optional description */
  readonly description?: string;
}

/**
 * Slot positions for compact display (same as CharacterDoll)
 */
const SLOT_POSITIONS: Record<ItemSlotType, { top: number; left: number }> = {
  helmet: { top: 20, left: 100 },
  amulet: { top: 52, left: 180 },
  chest: { top: 90, left: 100 },
  gloves: { top: 200, left: 22 },
  mainHand: { top: 90, left: 22 },
  offHand: { top: 90, left: 181 },
  ring1: { top: 200, left: 180 },
  ring2: { top: 200, left: 215 },
  shoes: { top: 200, left: 100 },
};

const SLOT_LABELS: Record<ItemSlotType, string> = {
  helmet: 'Helmet',
  amulet: 'Amulet',
  chest: 'Chest Armor',
  gloves: 'Gloves',
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  shoes: 'Shoes',
};

/**
 * Calculate upgrade bonus
 */
function calculateUpgradeBonus(upgrade: any, level: number): number {
  if (upgrade.type === 'powder') {
    return level;
  } else if (upgrade.stat === 'damage' || upgrade.stat === 'armour') {
    return Math.ceil(level / 5);
  }
  return 0;
}

/**
 * Calculate character stats from equipped items
 */
function calculateCharacterStats(
  equippedItems: Map<ItemSlotType, EquippedItem>,
  characterLevel: number,
  baseStats: BaseStats
): CharacterStats {
  let totalArmor = 0;
  let totalDamageMin = 0;
  let totalDamageMax = 0;
  let totalHealth = 0;
  let bonusDamageFromItems = 0;
  let enchantDamageBonus = 0;
  let enchantArmorBonus = 0;
  const combinedStats = new Map<string, { flat: number; percent: number }>();

  // Process each equipped item
  equippedItems.forEach((equippedItem, slot) => {
    const itemStats = calculateItemStats(
      equippedItem.baseItem,
      equippedItem.rarity,
      equippedItem.conditioned,
      equippedItem.prefix,
      equippedItem.suffix
    );

    // Add armor
    if (itemStats.armour) {
      totalArmor += itemStats.armour;
    }

    // Add enchant bonus
    if (equippedItem.enchantValue) {
      if (slot === 'mainHand') {
        enchantDamageBonus += equippedItem.enchantValue;
      } else {
        enchantArmorBonus += equippedItem.enchantValue;
      }
    }

    // Process upgrades
    if (equippedItem.upgrades && equippedItem.upgrades.length > 0) {
      equippedItem.upgrades.forEach(appliedUpgrade => {
        const bonus = calculateUpgradeBonus(appliedUpgrade.upgrade, appliedUpgrade.level);
        
        if (appliedUpgrade.upgrade.stat === 'damage') {
          enchantDamageBonus += bonus;
        } else if (appliedUpgrade.upgrade.stat === 'armour') {
          enchantArmorBonus += bonus;
        } else {
          const statName = appliedUpgrade.upgrade.stat.charAt(0).toUpperCase() + appliedUpgrade.upgrade.stat.slice(1);
          const existing = combinedStats.get(statName) || { flat: 0, percent: 0 };
          combinedStats.set(statName, {
            flat: existing.flat + bonus,
            percent: existing.percent,
          });
        }
      });
    }

    // Add weapon damage
    if (slot === 'mainHand' && equippedItem.baseItem.type === 'weapons') {
      if (itemStats.damage) {
        totalDamageMin += itemStats.damage.min || 0;
        totalDamageMax += itemStats.damage.max || 0;
      }
    }

    // Collect item stats
    if (itemStats.stats) {
      Object.entries(itemStats.stats).forEach(([statName, statValue]) => {
        const existing = combinedStats.get(statName) || { flat: 0, percent: 0 };
        
        if (typeof statValue === 'object' && 'flat' in statValue && 'percent' in statValue) {
          combinedStats.set(statName, {
            flat: existing.flat + (statValue.flat || 0),
            percent: existing.percent + (statValue.percent || 0),
          });
        } else if (typeof statValue === 'number') {
          combinedStats.set(statName, {
            flat: existing.flat + statValue,
            percent: existing.percent,
          });
        }
      });
    }

    // Add +Damage from prefixes
    if (itemStats.prefixDamage) {
      bonusDamageFromItems += itemStats.prefixDamage;
    }

    // Add +Health from prefixes
    if (itemStats.prefixHealth) {
      totalHealth += itemStats.prefixHealth;
    }
  });

  // Apply enchant bonuses
  totalArmor += enchantArmorBonus;
  const weaponDamageFromEnchants = enchantDamageBonus + bonusDamageFromItems;
  totalDamageMin += weaponDamageFromEnchants;
  totalDamageMax += weaponDamageFromEnchants;

  // Add strength bonus to damage
  const strength = combinedStats.get('Strength')?.flat || 0;
  const damageFromStrength = Math.floor(strength / 5);
  totalDamageMin += damageFromStrength;
  totalDamageMax += damageFromStrength;

  // Calculate health
  const constitution = combinedStats.get('Constitution')?.flat || 0;
  const healthFromLevel = characterLevel * 5;
  const healthFromConstitution = constitution * 5;
  const healthFromItems = totalHealth;
  totalHealth = healthFromLevel + healthFromConstitution + healthFromItems;

  return {
    totalArmor,
    totalDamageMin,
    totalDamageMax,
    totalHealth,
    stats: combinedStats,
    damageFromWeapons: { min: totalDamageMin - damageFromStrength - weaponDamageFromEnchants, max: totalDamageMax - damageFromStrength - weaponDamageFromEnchants },
    damageFromStrength,
    damageFromItems: weaponDamageFromEnchants,
    healthFromLevel,
    healthFromConstitution,
    healthFromItems,
    healthRegenPerHour: 0,
  };
}

/**
 * Decode build data from query string parameters
 */
function decodeBuildData(
  buildString: string,
  levelString: string,
  statsString?: string
): { items: Map<ItemSlotType, EquippedItem>; level: number; baseStats: BaseStats } | null {
  try {
    const level = Number.parseInt(levelString, 10);
    if (level < 1 || level > 1000) return null;

    let baseStats: BaseStats = {
      strength: 0,
      dexterity: 0,
      agility: 0,
      constitution: 0,
      charisma: 0,
      intelligence: 0,
    };

    if (statsString) {
      try {
        const decoded = atob(statsString);
        baseStats = JSON.parse(decoded);
      } catch (e) {
        console.error('Failed to decode stats:', e);
      }
    }

    const decoded = atob(buildString);
    const data = JSON.parse(decoded);

    const items = new Map<ItemSlotType, EquippedItem>();
    Object.entries(data).forEach(([slot, itemData]: [string, any]) => {
      if (itemData) {
        items.set(slot as ItemSlotType, itemData);
      }
    });

    return { items, level, baseStats };
  } catch (error) {
    console.error('Failed to decode build data:', error);
    return null;
  }
}

/**
 * Load build data from URL parameters
 */
function loadBuildFromUrl(): { items: Map<ItemSlotType, EquippedItem>; level: number; baseStats: BaseStats } | null {
  if (globalThis.window === undefined) return null;

  try {
    const params = new URLSearchParams(globalThis.window.location.search);
    const buildData = params.get('build');
    const levelParam = params.get('level');
    const statsParam = params.get('stats');

    if (!buildData || !levelParam) return null;

    const level = Number.parseInt(levelParam, 10);
    if (level < 1 || level > 1000) return null;

    let baseStats: BaseStats = {
      strength: 0,
      dexterity: 0,
      agility: 0,
      constitution: 0,
      charisma: 0,
      intelligence: 0,
    };

    if (statsParam) {
      try {
        const decoded = atob(statsParam);
        baseStats = JSON.parse(decoded);
      } catch (e) {
        console.error('Failed to load stats from URL:', e);
      }
    }

    const decoded = atob(buildData);
    const data = JSON.parse(decoded);

    const items = new Map<ItemSlotType, EquippedItem>();
    Object.entries(data).forEach(([slot, itemData]: [string, any]) => {
      if (itemData) {
        items.set(slot as ItemSlotType, itemData);
      }
    });

    return { items, level, baseStats };
  } catch (error) {
    console.error('Failed to load build from URL:', error);
    return null;
  }
}

/**
 * Parse query string to extract build parameters
 */
function parseQueryString(query: string): { build?: string; level?: string; stats?: string } | null {
  try {
    const params = new URLSearchParams(query);
    const build = params.get('build');
    const level = params.get('level');
    const stats = params.get('stats');
    
    if (!build || !level) return null;
    
    return { build, level, stats: stats || undefined };
  } catch (error) {
    console.error('Failed to parse query string:', error);
    return null;
  }
}

/**
 * Compact read-only display of a character build
 * Perfect for showcasing optimal builds in guides
 */
export default function CompactBuildDisplay({ 
  query: queryString,
  build: buildString,
  level: levelProp,
  stats: statsString,
  buildData: propBuildData, 
  showPlannerLink = true,
  title: propTitle,
  description: propDescription,
}: CompactBuildDisplayProps) {
  // Priority: query > build/level/stats > buildData > URL
  const decodedBuildData = useMemo(() => {
    // Try query string first (simplest method)
    if (queryString) {
      const parsed = parseQueryString(queryString);
      if (parsed) {
        return decodeBuildData(parsed.build!, parsed.level!, parsed.stats);
      }
    }
    
    // Fall back to individual props
    if (buildString && levelProp) {
      const levelStr = typeof levelProp === 'number' ? levelProp.toString() : levelProp;
      return decodeBuildData(buildString, levelStr, statsString);
    }
    return null;
  }, [queryString, buildString, levelProp, statsString]);

  const urlBuildData = useMemo(() => {
    if (queryString || buildString || propBuildData) return null; // Don't load from URL if props provided
    return loadBuildFromUrl();
  }, [queryString, buildString, propBuildData]);

  const buildData = decodedBuildData || propBuildData || urlBuildData;

  // Calculate stats (must be before early return to avoid conditional hooks)
  const stats = useMemo(() => {
    if (!buildData) return null;
    return calculateCharacterStats(buildData.items, buildData.level, buildData.baseStats);
  }, [buildData]);

  // Generate planner URL (must be before early return to avoid conditional hooks)
  const plannerUrl = useMemo(() => {
    if (globalThis.window === undefined || !buildData) return '';
    
    const itemsObj: Record<string, any> = {};
    buildData.items.forEach((item, slot) => {
      itemsObj[slot] = item;
    });

    const json = JSON.stringify(itemsObj);
    const encoded = btoa(json);
    const statsJson = JSON.stringify(buildData.baseStats);
    const statsEncoded = btoa(statsJson);

    // Build query string manually to ensure proper encoding
    const queryParams = new URLSearchParams();
    queryParams.set('build', encoded);
    queryParams.set('level', buildData.level.toString());
    queryParams.set('stats', statsEncoded);
    
    // Use relative path from root for better compatibility with static site deployment
    return `/character-planner?${queryParams.toString()}`;
  }, [buildData]);

  if (!buildData || !stats) {
    return (
      <div className={styles.error}>
        No build data available. Provide buildData prop or use valid URL parameters.
      </div>
    );
  }

  const { items, level, baseStats } = buildData;
  const buildTitle: string | undefined = ('title' in buildData && typeof buildData.title === 'string') ? buildData.title : undefined;
  const buildDescription: string | undefined = ('description' in buildData && typeof buildData.description === 'string') ? buildData.description : undefined;
  const displayTitle = propTitle || buildTitle || `Level ${level} Build`;
  const displayDescription = propDescription || buildDescription;

  return (
    <div className={styles.compactBuildDisplay}>
      <div className={styles.header}>
        <h3 className={styles.title}>{displayTitle}</h3>
        {displayDescription && <p className={styles.description}>{displayDescription}</p>}
      </div>

      <div className={styles.content}>
        {/* Character Doll */}
        <div className={styles.dollSection}>
          <div className={styles.characterDoll}>
            <img 
              src="https://gladiatusfansite.blob.core.windows.net/images/doll.jpg" 
              alt="Character Build"
              className={styles.dollImage}
            />
            
            <div className={styles.slotsOverlay}>
              {(Object.keys(SLOT_POSITIONS) as ItemSlotType[]).map((slot) => {
                const equippedItem = items.get(slot);
                let size: 'small' | 'normal' | 'tall' = 'normal';
                if (slot === 'amulet' || slot === 'ring1' || slot === 'ring2') {
                  size = 'small';
                } else if (slot === 'mainHand' || slot === 'offHand' || slot === 'chest') {
                  size = 'tall';
                }

                return (
                  <ItemSlot
                    key={slot}
                    slotName={SLOT_LABELS[slot]}
                    item={equippedItem || null}
                    onClick={() => {}}
                    position={SLOT_POSITIONS[slot]}
                    size={size}
                    characterLevel={level}
                    characterBaseStats={baseStats}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats Display */}
        <div className={styles.statsSection}>
          <div className={styles.statsContainer}>
            {/* Build Stats */}
            <div className={styles.statsColumn}>
              <h4 className={styles.statsTitle}>Build Stats</h4>
              
              <div className={styles.statsGrid}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Level:</span>
                  <span className={styles.statValue}>{level}</span>
                </div>
                
                {stats.totalDamageMin > 0 && (
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Damage:</span>
                    <span className={styles.statValue}>
                      {stats.totalDamageMin} - {stats.totalDamageMax}
                    </span>
                  </div>
                )}
                
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Armor:</span>
                  <span className={styles.statValue}>{stats.totalArmor}</span>
                </div>
                
                {stats.totalHealth > 0 && (
                  <div className={styles.statRow}>
                    <span className={styles.statLabel}>Health:</span>
                    <span className={styles.statValue}>{stats.totalHealth}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Character Attributes */}
            <div className={styles.statsColumn}>
              <h4 className={styles.statsTitle}>Base Stats</h4>
              
              <div className={styles.statsGrid}>
                {['Strength', 'Dexterity', 'Agility', 'Constitution', 'Charisma', 'Intelligence'].map(statName => {
                  const statKey = statName.toLowerCase() as keyof BaseStats;
                  const baseValue = baseStats[statKey] || 0;
                  const bonuses = stats.stats.get(statName) || { flat: 0, percent: 0 };
                  const flatBonus = bonuses.flat;
                  const totalBeforePercent = baseValue + flatBonus;
                  const percentBonus = Math.floor(totalBeforePercent * bonuses.percent / 100);
                  const totalValue = totalBeforePercent + percentBonus;
                  
                  return (
                    <div key={statName} className={styles.statRow}>
                      <span className={styles.statLabel}>{statName}:</span>
                      <span className={styles.statValue}>{totalValue}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {showPlannerLink && (
            <a href={plannerUrl} className={styles.plannerLink}>
              Open in Character Planner →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
