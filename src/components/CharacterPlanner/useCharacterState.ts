import { useState, useEffect, useMemo } from 'react';
import { BaseItem, PrefixSuffix, ItemRarity, calculateItemStats } from '../Item';

export type ItemSlotType = 'helmet' | 'amulet' | 'chest' | 'gloves' | 'mainHand' | 'offHand' | 'shoes' | 'ring1' | 'ring2';

export interface EquippedItem {
  baseItem: BaseItem;
  prefix?: PrefixSuffix;
  suffix?: PrefixSuffix;
  rarity: ItemRarity;
  conditioned: boolean;
}

export interface CharacterStats {
  totalArmor: number;
  totalDamageMin: number;
  totalDamageMax: number;
  totalHealth: number;
  stats: Map<string, { flat: number; percent: number }>;
}

export interface CharacterState {
  equippedItems: Map<ItemSlotType, EquippedItem>;
  characterLevel: number;
  setCharacterLevel: (level: number) => void;
  setItem: (slot: ItemSlotType, item: EquippedItem | null) => void;
  removeItem: (slot: ItemSlotType) => void;
  clearAll: () => void;
  characterStats: CharacterStats;
  shareUrl: string;
  loadFromUrl: () => void;
}

/**
 * Custom hook to manage character planner state
 * Handles equipped items, stat calculations, and URL sharing
 */
export function useCharacterState(): CharacterState {
  const [equippedItems, setEquippedItems] = useState<Map<ItemSlotType, EquippedItem>>(new Map());
  const [characterLevel, setCharacterLevel] = useState<number>(1);

  // Load from URL on mount
  useEffect(() => {
    loadFromUrl();
  }, []);

  // Update URL when items or level change
  useEffect(() => {
    updateUrl();
  }, [equippedItems, characterLevel]);

  /**
   * Load character build from URL query parameters
   */
  const loadFromUrl = () => {
    if (globalThis.window === undefined) return;

    try {
      const params = new URLSearchParams(globalThis.window.location.search);
      const buildData = params.get('build');
      const levelParam = params.get('level');
      
      if (levelParam) {
        const level = Number.parseInt(levelParam, 10);
        if (level >= 1 && level <= 150) {
          setCharacterLevel(level);
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
  };

  /**
   * Update URL with current character build
   */
  const updateUrl = () => {
    if (globalThis.window === undefined) return;

    try {
      // Convert Map to plain object for serialization
      const itemsObj: Record<string, EquippedItem> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });

      // Encode as base64
      const json = JSON.stringify(itemsObj);
      const encoded = btoa(json);

      // Update URL without reload
      const url = new URL(globalThis.window.location.href);
      if (equippedItems.size > 0) {
        url.searchParams.set('build', encoded);
      } else {
        url.searchParams.delete('build');
      }
      url.searchParams.set('level', characterLevel.toString());
      
      globalThis.window.history.replaceState({}, '', url.toString());
    } catch (error) {
      console.error('Failed to update URL:', error);
    }
  };

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
   * Calculate total character stats from all equipped items
   */
  const characterStats = useMemo((): CharacterStats => {
    let totalArmor = 0;
    let totalDamageMin = 0;
    let totalDamageMax = 0;
    let totalHealth = 0;
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

    return {
      totalArmor,
      totalDamageMin,
      totalDamageMax,
      totalHealth,
      stats: combinedStats,
    };
  }, [equippedItems]);

  /**
   * Generate shareable URL
   */
  const shareUrl = useMemo(() => {
    if (globalThis.window === undefined) return '';
    return globalThis.window.location.href;
  }, [equippedItems]);

  return {
    equippedItems,
    characterLevel,
    setCharacterLevel,
    setItem,
    removeItem,
    clearAll,
    characterStats,
    shareUrl,
    loadFromUrl,
  };
}
