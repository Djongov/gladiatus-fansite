import type { BaseItem, PrefixSuffix, ItemRarity } from '../Item';
import type { ItemSlotType, BaseStats, EquippedItem, CharacterIdentity, Upgrade, AppliedUpgrade } from './useCharacterState';
import type { PactId } from './PactDefinitions';

import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import upgradesData from '@site/static/data/items/upgrades.json';

const PRIMARY_API_URL = 'https://gladiatus-player-parser.gladiatus.workers.dev';
const FALLBACK_API_URL = 'https://gladiatus-api.gamerz-bg.com/api/fetch-player';

/**
 * Totals exactly as the game's profile page shows them. They include effects the
 * planner cannot see from items alone (buffs, guild bonuses, events…).
 */
export interface ReportedTotals {
  maxHp: number;
  damageMin: number;
  damageMax: number;
  armour: number;
  strength: number;
  dexterity: number;
  agility: number;
  constitution: number;
  charisma: number;
  intelligence: number;
}

export interface ImportedProfile {
  level: number;
  baseStats: BaseStats;
  items: Map<ItemSlotType, EquippedItem>;
  identity: CharacterIdentity;
  pacts?: Set<PactId>;
  reportedTotals?: ReportedTotals;
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
  pacts?: Record<string, boolean>;
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

const SLOT_MAP: Record<string, ItemSlotType> = {
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

// Map API item_type to bases.json type field (which is plural)
const ITEM_TYPE_MAP: Record<string, string> = {
  'weapon': 'weapons',
  'shield': 'shields',
  'helmet': 'helmets',
  'chest armor': 'armour',
  'gloves': 'gloves',
  'shoes': 'shoes',
  'amulet': 'amulets',
  'ring': 'rings',
};

const PACT_KEY_MAP: Record<string, PactId> = {
  'blessing_of_venus':                        'blessing_venus',
  'blessing_of_jupiter':                      'blessing_jupiter',
  'honour_of_the_berserker':                  'honour_berserker',
  'honour_of_the_armourer':                   'honour_armourer',
  'honour_of_the_veteran':                    'honour_veteran',
  'honour_of_the_hero':                       'honour_hero',
  'secret_knowledege_of_the_assassins':       'sk_assassins',
  'secret_knowledege_of_the_immortals':       'sk_immortals',
};

const RARITY_MAP: Record<string, ItemRarity> = {
  'common': 'common',
  'green': 'green',
  'blue': 'blue',
  'purple': 'purple',
  'orange': 'orange',
  'red': 'red',
};

const mapItemType = (apiItemType: string): string =>
  ITEM_TYPE_MAP[apiItemType.toLowerCase()] || apiItemType;

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

const findPrefix = (prefixId: number): PrefixSuffix | null =>
  (prefixesData as any[]).find(p => p.id === prefixId) || null;

const findSuffix = (suffixId: number): PrefixSuffix | null =>
  (suffixesData as any[]).find(s => s.id === suffixId) || null;

const mapPacts = (apiPacts: Record<string, boolean>): Set<PactId> => {
  const active = new Set<PactId>();
  for (const [key, enabled] of Object.entries(apiPacts)) {
    if (enabled && PACT_KEY_MAP[key]) {
      active.add(PACT_KEY_MAP[key]);
    }
  }
  return active;
};

const mapRarity = (apiRarity: string): ItemRarity =>
  RARITY_MAP[apiRarity.toLowerCase()] || 'common';

async function requestProfile(profileUrl: string): Promise<Response> {
  // Try primary API (Cloudflare Worker); fall back on network failure or 500
  try {
    const response = await fetch(PRIMARY_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_url: profileUrl }),
    });
    if (response.status === 500) {
      throw new Error('Primary API returned 500');
    }
    return response;
  } catch (primaryError) {
    console.log('Primary API failed, attempting fallback API...', primaryError instanceof Error ? primaryError.message : primaryError);
    const formData = new URLSearchParams();
    formData.append('profile_url', profileUrl);
    return fetch(FALLBACK_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  // Try to get detailed error message from API response
  let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } else {
      const textResponse = await response.text();
      if (textResponse && textResponse.length < 500) {
        errorMessage = `${errorMessage} - ${textResponse}`;
      }
    }
  } catch (parseError) {
    // Expected for malformed or HTML error responses; keep the default message
    console.error('Error while parsing error response:', parseError);
  }
  return errorMessage;
}

function mapApiItem(apiItem: ApiItem): EquippedItem | null {
  const baseItem = findBaseItem(apiItem.base_item_id, apiItem.base_item_name, apiItem.item_type);
  if (!baseItem) {
    console.warn(`Base item not found: ${apiItem.base_item_id || apiItem.base_item_name} (type: ${apiItem.item_type})`);
    return null;
  }

  // Parse enchant - different meaning for rings/amulets vs other items
  let enchantValue: number | undefined;
  let upgrades: AppliedUpgrade[] | undefined;

  if (apiItem.enchant && apiItem.enchant.value) {
    const enchantLevel = parseInt(apiItem.enchant.value, 10);

    // For rings and amulets, enchant contains powder data
    if (baseItem.type === 'rings' || baseItem.type === 'amulets') {
      const powderStat = apiItem.enchant.type.toLowerCase();
      const powderUpgrade = (upgradesData as Upgrade[]).find(
        upgrade => upgrade.type === 'powder' && upgrade.stat.toLowerCase() === powderStat
      );
      if (powderUpgrade) {
        upgrades = [{ upgrade: powderUpgrade, level: enchantLevel }];
      }
    } else {
      // For other items, enchant is protective gear/grindstone
      enchantValue = enchantLevel;
    }
  }

  return {
    baseItem,
    prefix: apiItem.prefix_id ? findPrefix(apiItem.prefix_id) : undefined,
    suffix: apiItem.suffix_id ? findSuffix(apiItem.suffix_id) : undefined,
    rarity: mapRarity(apiItem.rarity),
    conditioned: apiItem.conditioned,
    enchantValue,
    upgrades,
  };
}

function mapReportedTotals(data: ApiResponse): ReportedTotals | undefined {
  const totals = {
    maxHp: data.max_life_points,
    damageMin: data.damage_min,
    damageMax: data.damage_max,
    armour: data.armour,
    strength: data.strength_max,
    dexterity: data.dexterity_max,
    agility: data.agility_max,
    constitution: data.constitution_max,
    charisma: data.charisma_max,
    intelligence: data.intelligence_max,
  };
  // Older parser responses omit some totals; only report a complete set
  return Object.values(totals).every(value => typeof value === 'number') ? totals as ReportedTotals : undefined;
}

/** Fetches a Gladiatus profile through the parser APIs and maps it to planner state. */
export async function fetchCharacterProfile(profileUrl: string): Promise<ImportedProfile> {
  const response = await requestProfile(profileUrl.trim());
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  let responseData = await response.json();
  // Fallback API wraps data in { result: "success", data: { ... } }; primary returns it directly
  if (responseData.result && responseData.data) {
    responseData = responseData.data;
  }
  const data: ApiResponse = responseData;

  const baseStats: BaseStats = {
    strength: data.strength_base,
    dexterity: data.dexterity_base,
    agility: data.agility_base,
    constitution: data.constitution_base,
    charisma: data.charisma_base,
    intelligence: data.intelligence_base,
  };

  const items = new Map<ItemSlotType, EquippedItem>();
  for (const apiItem of data.items) {
    const slot = SLOT_MAP[apiItem.slot];
    if (!slot) {
      console.warn(`Unknown slot type: ${apiItem.slot}`);
      continue;
    }
    const equippedItem = mapApiItem(apiItem);
    if (equippedItem) items.set(slot, equippedItem);
  }

  const identity: CharacterIdentity = {
    name: data.name,
    title: data.title || undefined,
    costume: data.costume || undefined,
    gender: 'male', // Default for imported characters since we don't get gender from API
  };

  return {
    level: data.level,
    baseStats,
    items,
    identity,
    pacts: data.pacts ? mapPacts(data.pacts) : undefined,
    reportedTotals: mapReportedTotals(data),
  };
}

/** Turns a profile fetch failure into a message suitable for showing to the user. */
export function describeProfileFetchError(err: unknown): string {
  if (!(err instanceof Error)) return 'Failed to import profile';
  // Provide more helpful messages for common errors
  if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
    return 'Network error: Unable to connect to the server. Please check your internet connection.';
  }
  if (err.message.includes('CORS')) {
    return 'Unable to access the profile. This may be a browser security restriction.';
  }
  return err.message;
}
