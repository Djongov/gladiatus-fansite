import React from 'react';
import CompactBuildDisplay from './CompactBuildDisplay';
import { EquippedItem, ItemSlotType, BaseStats } from './useCharacterState';

/**
 * Unicode-safe base64 encoding
 * Handles special characters, emojis, and international characters
 */
function safeBase64Encode(str: string): string {
  // Convert string to UTF-8 bytes, then to base64
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(Number.parseInt(p1, 16));
  }));
}

/**
 * Unicode-safe base64 decoding
 * Handles special characters, emojis, and international characters
 */
function safeBase64Decode(str: string): string {
  // Decode from base64 to UTF-8 bytes, then to string
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

interface BuildHelperProps {
  /** Encoded build string from URL (simplest method) */
  readonly build?: string;
  /** Character level */
  readonly level: number;
  /** Encoded stats string from URL (optional) */
  readonly stats?: string;
  /** Build title */
  readonly title?: string;
  /** Build description */
  readonly description?: string;
  /** Base stats object (alternative to stats string) */
  readonly baseStats?: Partial<BaseStats>;
  /** Equipped items as a simple object (alternative to build string) */
  readonly items?: Partial<Record<ItemSlotType, EquippedItem>>;
  /** Whether to show link to full planner */
  readonly showPlannerLink?: boolean;
}

/**
 * Helper component to easily create compact build displays
 * Simplifies the process of defining builds in MDX or React
 * 
 * @example
 * ```tsx
 * // Easiest: Just copy the query params from a shared build URL
 * <BuildHelper
 *   build="eyJoZWxtZXQ..."
 *   level={85}
 *   stats="eyJzdHJlbmd..."
 *   title="Optimal Tank Build"
 * />
 * 
 * // Or define items manually
 * <BuildHelper
 *   level={85}
 *   title="Optimal Tank Build"
 *   items={{ helmet: {...}, chest: {...} }}
 *   baseStats={{ strength: 80, constitution: 120 }}
 * />
 * ```
 */
export default function BuildHelper({
  build,
  level,
  stats,
  title,
  description,
  baseStats,
  items,
  showPlannerLink = true,
}: BuildHelperProps) {
  // If build string is provided, pass directly to CompactBuildDisplay
  if (build) {
    return (
      <CompactBuildDisplay
        build={build}
        level={level}
        stats={stats}
        showPlannerLink={showPlannerLink}
        title={title}
        description={description}
      />
    );
  }

  // Otherwise, convert items object to Map and create buildData
  const itemsMap = new Map<ItemSlotType, EquippedItem>();
  if (items) {
    Object.entries(items).forEach(([slot, item]) => {
      if (item) {
        itemsMap.set(slot as ItemSlotType, item);
      }
    });
  }

  // Create complete base stats with defaults
  const completeBaseStats: BaseStats = {
    strength: baseStats?.strength || 0,
    dexterity: baseStats?.dexterity || 0,
    agility: baseStats?.agility || 0,
    constitution: baseStats?.constitution || 0,
    charisma: baseStats?.charisma || 0,
    intelligence: baseStats?.intelligence || 0,
  };

  return (
    <CompactBuildDisplay
      buildData={{
        items: itemsMap,
        level,
        baseStats: completeBaseStats,
        title,
        description,
      }}
      showPlannerLink={showPlannerLink}
    />
  );
}

/**
 * Create a shareable build URL from build data
 * Useful for generating links programmatically
 */
export function createBuildUrl(
  items: Map<ItemSlotType, EquippedItem>,
  level: number,
  baseStats: BaseStats,
  baseUrl: string = ''
): string {
  const itemsObj: Record<string, any> = {};
  items.forEach((item, slot) => {
    itemsObj[slot] = item;
  });

  const json = JSON.stringify(itemsObj);
  const encoded = safeBase64Encode(json);
  const statsJson = JSON.stringify(baseStats);
  const statsEncoded = safeBase64Encode(statsJson);

  const url = new URL(baseUrl || (globalThis.window === undefined ? '' : globalThis.window.location.origin) + '/character-planner');
  url.searchParams.set('build', encoded);
  url.searchParams.set('level', level.toString());
  url.searchParams.set('stats', statsEncoded);

  return url.toString();
}

/**
 * Parse a build URL and extract build data
 * Useful for sharing and importing builds
 */
export function parseBuildUrl(url: string): {
  items: Map<ItemSlotType, EquippedItem>;
  level: number;
  baseStats: BaseStats;
} | null {
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
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
      const decoded = safeBase64Decode(statsParam);
      baseStats = JSON.parse(decoded);
    }

    const decoded = safeBase64Decode(buildData);
    const data = JSON.parse(decoded);

    const items = new Map<ItemSlotType, EquippedItem>();
    Object.entries(data).forEach(([slot, itemData]: [string, any]) => {
      if (itemData) {
        items.set(slot as ItemSlotType, itemData);
      }
    });

    return { items, level, baseStats };
  } catch (error) {
    console.error('Failed to parse build URL:', error);
    return null;
  }
}
