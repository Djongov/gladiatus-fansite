import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BaseItem, PrefixSuffix, ItemRarity, calculateItemStats } from '../Item';

export type ItemSlotType = 'helmet' | 'amulet' | 'chest' | 'gloves' | 'mainHand' | 'offHand' | 'shoes' | 'ring1' | 'ring2';

export interface EquippedItem {
  baseItem: BaseItem;
  prefix?: PrefixSuffix;
  suffix?: PrefixSuffix;
  rarity: ItemRarity;
  conditioned: boolean;
}

export interface BaseStats {
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
}

export interface CharacterStats {
  totalArmor: number;
  totalDamageMin: number;
  totalDamageMax: number;
  totalHealth: number;
  stats: Map<string, { flat: number; percent: number }>;
  // Damage breakdown
  damageFromWeapons: { min: number; max: number };
  damageFromStrength: number;
  damageFromItems: number;
  // Health breakdown
  healthFromLevel: number;
  healthFromConstitution: number;
  healthFromItems: number;
  healthRegenPerHour: number;
}

export interface CharacterState {
  equippedItems: Map<ItemSlotType, EquippedItem>;
  characterLevel: number;
  baseStats: BaseStats;
  setCharacterLevel: (level: number) => void;
  setBaseStats: (stats: Partial<BaseStats>) => void;
  setItem: (slot: ItemSlotType, item: EquippedItem | null) => void;
  removeItem: (slot: ItemSlotType) => void;
  clearAll: () => void;
  characterStats: CharacterStats;
  loadFromUrl: () => void;
}

/**
 * Custom hook to manage character planner state
 * Handles equipped items, stat calculations, and URL sharing
 */
export function useCharacterState(): CharacterState {
  const [equippedItems, setEquippedItems] = useState<Map<ItemSlotType, EquippedItem>>(new Map());
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [baseStats, setBaseStatsState] = useState<BaseStats>({
    strength: 5,
    dexterity: 5,
    agility: 5,
    constitution: 5,
    charisma: 5,
    intelligence: 5,
  });
  const isInitialMount = useRef(true);

  /**
   * Load character build from URL query parameters
   */
  const loadFromUrl = useCallback(() => {
    if (globalThis.window === undefined) return;

    try {
      const params = new URLSearchParams(globalThis.window.location.search);
      const buildData = params.get('build');
      const levelParam = params.get('level');
      const statsParam = params.get('stats');
      
      if (levelParam) {
        const level = Number.parseInt(levelParam, 10);
        if (level >= 1 && level <= 150) {
          setCharacterLevel(level);
        }
      }

      if (statsParam) {
        try {
          const decoded = atob(statsParam);
          const stats = JSON.parse(decoded);
          setBaseStatsState(stats);
        } catch (e) {
          console.error('Failed to load stats from URL:', e);
        }
      }
      
      if (buildData) {
        // Decode base64 and parse JSON
        const decoded = atob(buildData);
        const data = JSON.parse(decoded);
        
        const newItems = new Map<ItemSlotType, EquippedItem>();
        
        // Reconstruct equipped items from serialized data
        Object.entries(data).forEach(([slot, itemData]: [string, any]) => {
          if (itemData) {
            newItems.set(slot as ItemSlotType, itemData);
          }
        });
        
        setEquippedItems(newItems);
      }
    } catch (error) {
      console.error('Failed to load build from URL:', error);
    }
  }, []);

  // Load from URL on mount
  useEffect(() => {
    loadFromUrl();
  }, [loadFromUrl]);

  // Update URL when items, level, or stats change (skip on initial mount)
  useEffect(() => {
    // Skip the first render to allow loadFromUrl to populate state first
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (globalThis.window === undefined) return;

    try {
      // Convert Map to plain object for serialization
      const itemsObj: Record<string, EquippedItem> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });

      // Update URL without reload
      const url = new URL(globalThis.window.location.href);
      
      // Add items if any
      if (equippedItems.size > 0) {
        const json = JSON.stringify(itemsObj);
        const encoded = btoa(json);
        url.searchParams.set('build', encoded);
      } else {
        url.searchParams.delete('build');
      }
      
      // Add level
      url.searchParams.set('level', characterLevel.toString());
      
      // Add base stats
      const statsJson = JSON.stringify(baseStats);
      const statsEncoded = btoa(statsJson);
      url.searchParams.set('stats', statsEncoded);
      
      globalThis.window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to update URL:', error);
    }
  }, [equippedItems, characterLevel, baseStats]);

  /**
   * Set or update an item in a specific slot
   */
  const setItem = (slot: ItemSlotType, item: EquippedItem | null) => {
    setEquippedItems(prev => {
      const newItems = new Map(prev);
      if (item) {
        newItems.set(slot, item);
      } else {
        newItems.delete(slot);
      }
      return newItems;
    });
  };

  /**
   * Remove item from a slot
   */
  const removeItem = (slot: ItemSlotType) => {
    setEquippedItems(prev => {
      const newItems = new Map(prev);
      newItems.delete(slot);
      return newItems;
    });
  };

  /**
   * Clear all equipped items
   */
  const clearAll = () => {
    setEquippedItems(new Map());
  };

  /**
   * Update base stats (partial update supported)
   */
  const setBaseStats = (newStats: Partial<BaseStats>) => {
    setBaseStatsState(prev => ({ ...prev, ...newStats }));
  };

  /**
   * Calculate total character stats from all equipped items
   */
  const characterStats = useMemo((): CharacterStats => {
    let totalArmor = 0;
    let totalDamageMin = 0;
    let totalDamageMax = 0;
    let totalHealth = 0;
    let bonusDamageFromItems = 0; // +Damage from non-weapon items
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

      // Add damage (only from weapons in mainHand/offHand)
      if ((slot === 'mainHand' || slot === 'offHand') && itemStats.damage) {
        totalDamageMin += itemStats.damage.min;
        totalDamageMax += itemStats.damage.max;
      }

      // Add +Damage from non-weapon items
      if (slot !== 'mainHand' && slot !== 'offHand' && itemStats.prefixDamage !== 0) {
        bonusDamageFromItems += itemStats.prefixDamage;
      }

      // Add health from prefix
      totalHealth += itemStats.prefixHealth;

      // Combine all stats
      itemStats.stats.forEach(stat => {
        const existing = combinedStats.get(stat.name) || { flat: 0, percent: 0 };
        combinedStats.set(stat.name, {
          flat: existing.flat + stat.flat,
          percent: existing.percent + stat.percent,
        });
      });
    });

    // Calculate final strength value (base + flat bonuses + percentage bonuses)
    const strengthStat = combinedStats.get('Strength') || { flat: 0, percent: 0 };
    const finalStrength = Math.floor((baseStats.strength + strengthStat.flat) * (1 + strengthStat.percent / 100));
    
    // Add 10% of Strength as damage
    const strengthDamage = Math.floor(finalStrength * 0.1);
    
    // Calculate final constitution value (base + flat bonuses + percentage bonuses)
    const constitutionStat = combinedStats.get('Constitution') || { flat: 0, percent: 0 };
    const finalConstitution = Math.floor((baseStats.constitution + constitutionStat.flat) * (1 + constitutionStat.percent / 100));
    
    // Calculate health components
    const healthFromLevel = characterLevel * 25;
    const healthFromConstitution = (finalConstitution * 25) - 100;
    const healthFromItems = totalHealth;
    const maxHealth = healthFromLevel + healthFromConstitution + healthFromItems;
    
    // Calculate health regeneration per hour
    const healthRegenPerHour = (characterLevel * 2) + (finalConstitution * 2);
    
    // Store weapon damage before adding bonuses
    const weaponDamageMin = totalDamageMin;
    const weaponDamageMax = totalDamageMax;
    
    // Add bonus damage from items and strength to total damage
    totalDamageMin += bonusDamageFromItems + strengthDamage;
    totalDamageMax += bonusDamageFromItems + strengthDamage;

    return {
      totalArmor,
      totalDamageMin,
      totalDamageMax,
      totalHealth: maxHealth,
      stats: combinedStats,
      damageFromWeapons: { min: weaponDamageMin, max: weaponDamageMax },
      damageFromStrength: strengthDamage,
      damageFromItems: bonusDamageFromItems,
      healthFromLevel,
      healthFromConstitution,
      healthFromItems,
      healthRegenPerHour,
    };
  }, [equippedItems, baseStats, characterLevel]);

  return {
    equippedItems,
    characterLevel,
    baseStats,
    setCharacterLevel,
    setBaseStats,
    setItem,
    removeItem,
    clearAll,
    characterStats,
    loadFromUrl,
  };
}
