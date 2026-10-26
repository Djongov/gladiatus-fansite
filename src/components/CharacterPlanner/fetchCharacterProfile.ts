import type { BaseItem, PrefixSuffix, ItemRarity } from '../Item';
import type { ItemSlotType, BaseStats, EquippedItem, CharacterIdentity, Upgrade, AppliedUpgrade } from './useCharacterState';
import type { PactId } from './PactDefinitions';
import { ATTRIBUTE_KEYS } from './turmaTypes';
import type {
  AttributeKey,
  AttributeStat,
  DollStats,
  ImportedDoll,
  ImportedTurma,
  MercenaryContract,
  MissingDataEntry,
} from './turmaTypes';

import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import upgradesData from '@site/static/data/items/upgrades.json';

const PRIMARY_API_URL = 'https://gladiatus-player-parser.gladiatus.workers.dev';
const FALLBACK_API_URL = 'https://gladiatus-api.gamerz-bg.com/api/fetch-player';

export interface ImportedProfile {
  level: number;
  baseStats: BaseStats;
  items: Map<ItemSlotType, EquippedItem>;
  identity: CharacterIdentity;
  pacts?: Set<PactId>;
  stats: DollStats;
  /** Absent when the importer predates Circus Turma support */
  turma?: ImportedTurma;
  /** Ids on the player's gear (all dolls) that our item data doesn't have yet */
  missingData: MissingDataEntry[];
}

/** What an import adds beyond the planner state; saved with the active character. */
export type ImportDetails = Pick<ImportedProfile, 'stats' | 'turma' | 'missingData'>;

type ReportMissing = (entry: Omit<MissingDataEntry, 'doll'>) => void;

/** The fields every doll page shares (main character, Turma profile, mercenaries). */
interface ApiDoll {
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
  healing?: number | null;
  threat?: number | null;
  items: ApiItem[];
  pacts?: Record<string, boolean>;
}

interface ApiContract {
  name: string;
  base_item_id: string;
  rarity: string;
  level: number;
  gold: number;
  life_points?: number | null;
  strength?: number | null;
  dexterity?: number | null;
  agility?: number | null;
  constitution?: number | null;
  charisma?: number | null;
  intelligence?: number | null;
}

type ApiTurmaDoll =
  | (ApiDoll & { status: 'ok'; role: string | null; contract?: ApiContract })
  | { status: 'empty' | 'locked' }
  | { status: 'error'; error: string };

interface ApiResponse extends ApiDoll {
  turma_profile?: ApiTurmaDoll;
  mercenary_slot_1?: ApiTurmaDoll;
  mercenary_slot_2?: ApiTurmaDoll;
  mercenary_slot_3?: ApiTurmaDoll;
  mercenary_slot_4?: ApiTurmaDoll;
}

interface ApiItem {
  name?: string;
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

function mapApiItem(apiItem: ApiItem, slot: ItemSlotType, reportMissing: ReportMissing): EquippedItem | null {
  const reportMissingId = (kind: MissingDataEntry['kind'], id: string) =>
    reportMissing({
      slot,
      kind,
      id,
      itemName: apiItem.name ?? apiItem.base_item_name,
      level: apiItem.level,
      rarity: apiItem.rarity,
    });

  const baseItem = findBaseItem(apiItem.base_item_id, apiItem.base_item_name, apiItem.item_type);
  if (!baseItem) {
    console.warn(`Base item not found: ${apiItem.base_item_id || apiItem.base_item_name} (type: ${apiItem.item_type})`);
    reportMissingId('base item', apiItem.base_item_id ?? apiItem.base_item_name);
    return null;
  }

  // Id 0 means the item has no prefix/suffix
  const prefix = apiItem.prefix_id ? findPrefix(apiItem.prefix_id) : undefined;
  if (apiItem.prefix_id && !prefix) reportMissingId('prefix', String(apiItem.prefix_id));
  const suffix = apiItem.suffix_id ? findSuffix(apiItem.suffix_id) : undefined;
  if (apiItem.suffix_id && !suffix) reportMissingId('suffix', String(apiItem.suffix_id));

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
    prefix: prefix ?? undefined,
    suffix: suffix ?? undefined,
    rarity: mapRarity(apiItem.rarity),
    conditioned: apiItem.conditioned,
    enchantValue,
    upgrades,
  };
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

  const missingData: MissingDataEntry[] = [];
  const reportMissingOn = (doll: string): ReportMissing => (entry) => missingData.push({ doll, ...entry });

  return {
    ...mapDoll(data, reportMissingOn(data.name)),
    pacts: data.pacts ? mapPacts(data.pacts) : undefined,
    stats: mapDollStats(data),
    turma: data.turma_profile ? mapTurma(data, reportMissingOn) : undefined,
    missingData,
  };
}

/** One mapping for every doll page: main character, Turma profile and mercenaries. */
function mapDoll(apiDoll: ApiDoll, reportMissing: ReportMissing): Pick<ImportedProfile, 'level' | 'baseStats' | 'items' | 'identity'> {
  const baseStats: BaseStats = {
    strength: apiDoll.strength_base,
    dexterity: apiDoll.dexterity_base,
    agility: apiDoll.agility_base,
    constitution: apiDoll.constitution_base,
    charisma: apiDoll.charisma_base,
    intelligence: apiDoll.intelligence_base,
  };

  const items = new Map<ItemSlotType, EquippedItem>();
  for (const apiItem of apiDoll.items) {
    const slot = SLOT_MAP[apiItem.slot];
    if (!slot) {
      console.warn(`Unknown slot type: ${apiItem.slot}`);
      continue;
    }
    const equippedItem = mapApiItem(apiItem, slot, reportMissing);
    if (equippedItem) items.set(slot, equippedItem);
  }

  const identity: CharacterIdentity = {
    name: apiDoll.name,
    title: apiDoll.title || undefined,
    costume: apiDoll.costume || undefined,
    gender: 'male', // Default for imported characters since we don't get gender from API
  };

  return { level: apiDoll.level, baseStats, items, identity };
}

const numberOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** "1370/4474" → items currently add 1370 of a possible 4474 */
function parseFromItems(fromItems: string | undefined): { applied: number | null; possible: number | null } {
  const [applied, possible] = (fromItems ?? '').split('/').map((part) => Number.parseInt(part, 10));
  return { applied: numberOrNull(applied), possible: numberOrNull(possible) };
}

function mapAttributes(apiDoll: ApiDoll): Record<AttributeKey, AttributeStat> {
  const entries = ATTRIBUTE_KEYS.map((key): [AttributeKey, AttributeStat] => {
    const base = apiDoll[`${key}_base`];
    const items = parseFromItems(apiDoll[`${key}_from_items`]);
    return [key, {
      // The game's displayed value: base plus what items currently add (already capped at the maximum)
      total: base + (items.applied ?? 0),
      base,
      max: numberOrNull(apiDoll[`${key}_max`]),
      itemsApplied: items.applied,
      itemsPossible: items.possible,
    }];
  });
  return Object.fromEntries(entries) as Record<AttributeKey, AttributeStat>;
}

function mapDollStats(apiDoll: ApiDoll): DollStats {
  return {
    lifePoints: numberOrNull(apiDoll.max_life_points),
    armour: numberOrNull(apiDoll.armour),
    damageMin: numberOrNull(apiDoll.damage_min),
    damageMax: numberOrNull(apiDoll.damage_max),
    healing: numberOrNull(apiDoll.healing),
    threat: numberOrNull(apiDoll.threat),
    attributes: mapAttributes(apiDoll),
  };
}

function mapContract(apiContract: ApiContract): MercenaryContract {
  return {
    name: apiContract.name,
    rarity: mapRarity(apiContract.rarity),
    level: apiContract.level,
    gold: apiContract.gold,
    lifePoints: numberOrNull(apiContract.life_points),
    strength: numberOrNull(apiContract.strength),
    dexterity: numberOrNull(apiContract.dexterity),
    agility: numberOrNull(apiContract.agility),
    constitution: numberOrNull(apiContract.constitution),
    charisma: numberOrNull(apiContract.charisma),
    intelligence: numberOrNull(apiContract.intelligence),
    baseItemId: apiContract.base_item_id,
  };
}

function mapTurmaDoll(
  apiDoll: ApiTurmaDoll | undefined,
  dollLabel: (name: string) => string,
  reportMissingOn: (doll: string) => ReportMissing,
): ImportedDoll {
  if (!apiDoll) return { status: 'error', error: 'missing from import' };
  if (apiDoll.status === 'error') return { status: 'error', error: apiDoll.error };
  if (apiDoll.status !== 'ok') return { status: apiDoll.status };

  return {
    status: 'ok',
    ...mapDoll(apiDoll, reportMissingOn(dollLabel(apiDoll.name))),
    role: apiDoll.role ?? null,
    stats: mapDollStats(apiDoll),
    contract: apiDoll.contract ? mapContract(apiDoll.contract) : undefined,
  };
}

function mapTurma(data: ApiResponse, reportMissingOn: (doll: string) => ReportMissing): ImportedTurma {
  const mercenary = (apiDoll: ApiTurmaDoll | undefined, slotNumber: number) =>
    mapTurmaDoll(apiDoll, (name) => `${name} (mercenary ${slotNumber})`, reportMissingOn);

  return {
    profile: mapTurmaDoll(data.turma_profile, () => 'Turma profile', reportMissingOn),
    mercenaries: [
      mercenary(data.mercenary_slot_1, 1),
      mercenary(data.mercenary_slot_2, 2),
      mercenary(data.mercenary_slot_3, 3),
      mercenary(data.mercenary_slot_4, 4),
    ],
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
