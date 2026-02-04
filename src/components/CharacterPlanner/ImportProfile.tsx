import React, { useState } from 'react';
import styles from './ImportProfile.module.css';
import type { BaseItem, PrefixSuffix, ItemRarity } from '../Item';
import type { ItemSlotType, BaseStats, EquippedItem, CharacterIdentity } from './useCharacterState';

// Import data files
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';

interface ImportProfileProps {
  onImport: (level: number, baseStats: BaseStats, items: Map<ItemSlotType, EquippedItem>, identity: CharacterIdentity) => void;
}

interface ApiResponse {
  result: string;
  data: {
    name: string;
    title?: string;
    costume?: string;
    level: number;
    strength_base: number;
    dexterity_base: number;
    agility_base: number;
    constitution_base: number;
    charisma_base: number;
    intelligence_base: number;
    items: ApiItem[];
  };
}

interface ApiItem {
  base_item_name: string;
  level: number;
  rarity: string;
  slot: string;
  item_type: string;
  conditioned: boolean;
  prefix_id?: number;
  suffix_id?: number;
  prefix_name?: string;
  suffix_name?: string;
  enchant?: {
    value: string;
    type: string;
  };
  hash_analyze?: {
    unknown_part_12?: number;
  };
}

export default function ImportProfile({ onImport }: ImportProfileProps) {
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mapSlotName = (apiSlot: string): ItemSlotType | null => {
    const slotMap: Record<string, ItemSlotType> = {
      'helmet': 'helmet',
      'weapon': 'mainHand',
      'shield': 'offHand',
      'chest armor': 'chest',
      'gloves': 'gloves',
      'shoes': 'shoes',
      'amulet': 'amulet',
      'left ring': 'ring1',
      'right ring': 'ring2',
    };
    return slotMap[apiSlot] || null;
  };

  const mapItemType = (apiItemType: string): string => {
    // Map API item_type to bases.json type field (which is plural)
    const typeMap: Record<string, string> = {
      'weapon': 'weapons',
      'shield': 'shields',
      'helmet': 'helmets',
      'chest armor': 'armour',
      'gloves': 'gloves',
      'shoes': 'shoes',
      'amulet': 'amulets',
      'ring': 'rings',
    };
    return typeMap[apiItemType.toLowerCase()] || apiItemType;
  };

  const findBaseItem = (baseItemName: string, itemType?: string): BaseItem | null => {
    // basesData is a flat array of all items
    const items = basesData as BaseItem[];
    
    // If we have item type, filter by it first for better matching
    const filteredItems = itemType 
      ? items.filter(item => item.type === mapItemType(itemType))
      : items;
    
    // Try exact match first (case-insensitive)
    let found = filteredItems.find((item: any) => 
      item.name.toLowerCase() === baseItemName.toLowerCase()
    );
    
    // If not found, try replacing underscores with spaces
    if (!found) {
      const nameWithSpaces = baseItemName.replace(/_/g, ' ');
      found = filteredItems.find((item: any) => 
        item.name.toLowerCase() === nameWithSpaces.toLowerCase()
      );
    }
    
    // If still not found, try matching without special characters
    if (!found) {
      const simplifiedSearch = baseItemName.toLowerCase().replace(/[^a-z0-9]/g, '');
      found = filteredItems.find((item: any) => 
        item.name.toLowerCase().replace(/[^a-z0-9]/g, '') === simplifiedSearch
      );
    }
    
    return found as BaseItem || null;
  };

  const findPrefix = (prefixId: number): PrefixSuffix | null => {
    return (prefixesData as any[]).find(
      p => p.id === prefixId
    ) || null;
  };

  const findSuffix = (suffixId: number): PrefixSuffix | null => {
    return (suffixesData as any[]).find(
      s => s.id === suffixId
    ) || null;
  };

  const mapRarity = (apiRarity: string): ItemRarity => {
    const rarityMap: Record<string, ItemRarity> = {
      'common': 'common',
      'green': 'green',
      'blue': 'blue',
      'purple': 'purple',
      'orange': 'orange',
      'red': 'red',
    };
    return rarityMap[apiRarity.toLowerCase()] || 'common';
  };

  const handleImport = async () => {
    if (!profileUrl.trim()) {
      setError('Please enter a profile URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create form data
      const formData = new URLSearchParams();
      formData.append('profile_url', profileUrl.trim());

      const response = await fetch('https://gladiatus-api.gamerz-bg.com/api/fetch-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: ApiResponse = await response.json();

      if (data.result !== 'success') {
        throw new Error('API returned an error response');
      }

      // Map base stats
      const baseStats: BaseStats = {
        strength: data.data.strength_base,
        dexterity: data.data.dexterity_base,
        agility: data.data.agility_base,
        constitution: data.data.constitution_base,
        charisma: data.data.charisma_base,
        intelligence: data.data.intelligence_base,
      };

      // Map items
      const itemsMap = new Map<ItemSlotType, EquippedItem>();
      
      for (const apiItem of data.data.items) {
        const slot = mapSlotName(apiItem.slot);
        if (!slot) {
          console.warn(`Unknown slot type: ${apiItem.slot}`);
          continue;
        }

        const baseItem = findBaseItem(apiItem.base_item_name, apiItem.item_type);
        if (!baseItem) {
          console.warn(`Base item not found: ${apiItem.base_item_name} (type: ${apiItem.item_type})`);
          continue;
        }

        const prefix = apiItem.prefix_id ? findPrefix(apiItem.prefix_id) : undefined;
        const suffix = apiItem.suffix_id ? findSuffix(apiItem.suffix_id) : undefined;
        const rarity = mapRarity(apiItem.rarity);

        // Use conditioned value directly from API
        const conditioned = apiItem.conditioned;

        // Parse enchant value
        const enchantValue = apiItem.enchant?.value 
          ? parseInt(apiItem.enchant.value, 10) 
          : undefined;

        const equippedItem: EquippedItem = {
          baseItem,
          prefix,
          suffix,
          rarity,
          conditioned,
          enchantValue,
          upgrades: [], // We don't have upgrade data from the API yet
        };

        itemsMap.set(slot, equippedItem);
      }

      // Create character identity
      const identity: CharacterIdentity = {
        name: data.data.name,
        title: data.data.title || undefined,
        costume: data.data.costume || undefined,
        gender: 'male', // Default for imported characters since we don't get gender from API
      };

      // Call the import callback
      onImport(data.data.level, baseStats, itemsMap, identity);
      
      setSuccess(true);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.importContainer}>
      <h3 className={styles.title}>Import Profile</h3>
      <div className={styles.inputGroup}>
        <input
          type="text"
          className={styles.input}
          placeholder="Enter Gladiatus profile URL"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          disabled={loading}
        />
        <button
          className={styles.button}
          onClick={handleImport}
          disabled={loading || !profileUrl.trim()}
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Profile imported successfully!</div>}
      <div className={styles.note}>
        Enter the URL of a Gladiatus character profile to automatically import their stats and equipment.
      </div>
    </div>
  );
}
