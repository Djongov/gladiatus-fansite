import type { ItemRarity } from '../Item';
import type { BaseStats, CharacterIdentity, EquippedItem, ItemSlotType } from './useCharacterState';

export const ATTRIBUTE_KEYS = ['strength', 'dexterity', 'agility', 'constitution', 'charisma', 'intelligence'] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

/** One primary stat as the game's stat tooltip shows it ("Basic", "Maximum", "Through items: +A from +B"). */
export type AttributeStat = {
  total: number;
  base: number;
  max: number | null;
  itemsApplied: number | null;
  itemsPossible: number | null;
};

/** Combat stats as the importer reports them (never recalculated). */
export type DollStats = {
  lifePoints: number | null;
  armour: number | null;
  damageMin: number | null;
  damageMax: number | null;
  healing: number | null;
  threat: number | null;
  /** Absent on records saved before the full stat panel; filled on the next refresh. */
  attributes?: Record<AttributeKey, AttributeStat>;
};

/** The mercenary's contract item from the Turma doll; base stats as shown on its tooltip. */
export type MercenaryContract = {
  name: string;
  rarity: ItemRarity;
  level: number;
  gold: number;
  lifePoints: number | null;
  strength: number | null;
  dexterity: number | null;
  agility: number | null;
  constitution: number | null;
  charisma: number | null;
  intelligence: number | null;
  /** e.g. "15-6"; the second part is also the mercenary's portrait number */
  baseItemId: string;
};

type DollWithoutData = { status: 'empty' | 'locked' } | { status: 'error'; error: string };

export type ImportedDoll =
  | {
      status: 'ok';
      level: number;
      baseStats: BaseStats;
      items: Map<ItemSlotType, EquippedItem>;
      identity: CharacterIdentity;
      role: string | null;
      stats: DollStats;
      contract?: MercenaryContract;
    }
  | DollWithoutData;

export type ImportedTurma = {
  profile: ImportedDoll;
  mercenaries: [ImportedDoll, ImportedDoll, ImportedDoll, ImportedDoll];
};

/** An id the import found on the player's gear that our item data doesn't have yet. */
export type MissingDataEntry = {
  /** Which doll the item is on, e.g. the character's name, "Turma profile", "Medicus (mercenary 1)" */
  doll: string;
  slot: ItemSlotType;
  kind: 'base item' | 'prefix' | 'suffix';
  id: string;
  /** The item's full in-game name */
  itemName: string;
  level: number;
  rarity: string;
};

/** Persisted form: gear is stored in the same compact format as ?s= share links. */
export type StoredDoll =
  | {
      status: 'ok';
      encoded: string;
      identity: CharacterIdentity;
      level: number;
      role: string | null;
      stats: DollStats;
      contract?: MercenaryContract;
    }
  | DollWithoutData;

export type StoredTurma = {
  profile: StoredDoll;
  mercenaries: StoredDoll[];
};
