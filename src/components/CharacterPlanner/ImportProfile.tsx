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
  name: string;
  title?: string;
  costume?: string;
  level: number;
  max_life_points?: number;
  strength_base: number;
  strength_max?: number;
  strength_from_items?: string;
  dexterity_base: number;
  dexterity_max?: number;
  dexterity_from_items?: string;
  agility_base: number;
  agility_max?: number;
  agility_from_items?: string;
  constitution_base: number;
  constitution_max?: number;
  constitution_from_items?: string;
  charisma_base: number;
  charisma_max?: number;
  charisma_from_items?: string;
  intelligence_base: number;
  intelligence_max?: number;
  intelligence_from_items?: string;
  armour?: number;
  damage_min?: number;
  damage_max?: number;
  items: ApiItem[];
}

interface ApiItem {
  base_item_id?: string;
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

  const findBaseItem = (baseItemId?: string, baseItemName?: string, itemType?: string): BaseItem | null => {
    // basesData is a flat array of all items
    const items = basesData as BaseItem[];
    
    // Try ID-based lookup first (locale-independent)
    if (baseItemId) {
      const foundById = items.find((item: any) => item.id === baseItemId);
      if (foundById) return foundById as BaseItem;
    }
    
    // Fallback to name-based lookup for backwards compatibility
    if (!baseItemName) return null;
    
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
      let response: Response;
      let usedFallback = false;

      // Try primary API (Cloudflare Worker)
      try {
        console.log('Attempting primary API (Cloudflare Worker)...');
        response = await fetch('https://gladiatus-player-parser.gladiatus.workers.dev', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile_url: profileUrl.trim(),
          }),
        });

        console.log('Primary API Response status:', response.status, response.statusText);

        // If we get a 500 error, try the fallback API
        if (response.status === 500) {
          console.log('Primary API returned 500, trying fallback API...');
          throw new Error('Primary API returned 500');
        }
      } catch (primaryError) {
        console.log('Primary API failed, attempting fallback API...');
        console.log('Primary API error:', primaryError instanceof Error ? primaryError.message : primaryError);
        
        // Try fallback API
        const formData = new URLSearchParams();
        formData.append('profile_url', profileUrl.trim());
        
        response = await fetch('https://gladiatus-api.gamerz-bg.com/api/fetch-player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        
        console.log('Fallback API Response status:', response.status, response.statusText);
        usedFallback = true;
      }

      if (!response.ok) {
        // Try to get detailed error message from API response
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
        console.log('Response not ok, attempting to read error details...');
        try {
          const contentType = response.headers.get('content-type');
          console.log('Content-Type:', contentType);
          if (contentType?.includes('application/json')) {
            console.log('Attempting to parse JSON error response...');
            const errorData = await response.json();
            console.log('Error data:', errorData);
            if (errorData.error) {
              errorMessage = errorData.error;
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } else {
            // Try to read as text for non-JSON responses
            console.log('Attempting to read text error response...');
            const textResponse = await response.text();
            console.log('Text response length:', textResponse.length);
            if (textResponse && textResponse.length < 500) {
              errorMessage = `${errorMessage} - ${textResponse}`;
            }
          }
        } catch (parseError) {
          // If parsing fails, use the default error message
          // This is expected for malformed or HTML error responses
          console.error('Error while parsing error response:', parseError);
          if (parseError instanceof Error) {
            console.error('Parse error message:', parseError.message);
            console.error('Parse error stack:', parseError.stack);
          }
        }
        console.log('About to throw error with message:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log(`Response ok from ${usedFallback ? 'fallback' : 'primary'} API, parsing success data...`);
      let responseData = await response.json();
      
      // Handle different response formats
      // Fallback API wraps data in { result: "success", data: { ... } }
      // Primary API returns data directly
      if (responseData.result && responseData.data) {
        console.log('Detected wrapped response format (fallback API), unwrapping...');
        responseData = responseData.data;
      }
      
      const data: ApiResponse = responseData;

      // Map base stats
      const baseStats: BaseStats = {
        strength: data.strength_base,
        dexterity: data.dexterity_base,
        agility: data.agility_base,
        constitution: data.constitution_base,
        charisma: data.charisma_base,
        intelligence: data.intelligence_base,
      };

      // Map items
      const itemsMap = new Map<ItemSlotType, EquippedItem>();
      
      for (const apiItem of data.items) {
        const slot = mapSlotName(apiItem.slot);
        if (!slot) {
          console.warn(`Unknown slot type: ${apiItem.slot}`);
          continue;
        }

        const baseItem = findBaseItem(apiItem.base_item_id, apiItem.base_item_name, apiItem.item_type);
        if (!baseItem) {
          console.warn(`Base item not found: ${apiItem.base_item_id || apiItem.base_item_name} (type: ${apiItem.item_type})`);
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
        name: data.name,
        title: data.title || undefined,
        costume: data.costume || undefined,
        gender: 'male', // Default for imported characters since we don't get gender from API
      };

      // Call the import callback
      onImport(data.level, baseStats, itemsMap, identity);
      
      setSuccess(true);
      setError(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Import error:', err);
      
      let errorMessage = 'Failed to import profile';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more helpful messages for common errors
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your internet connection.';
        } else if (errorMessage.includes('CORS')) {
          errorMessage = 'Unable to access the profile. This may be a browser security restriction.';
        }
      }
      
      setError(errorMessage);
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
