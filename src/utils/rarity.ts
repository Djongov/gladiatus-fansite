import type { ItemRarity } from '@site/src/components/Item';

export const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  common: 1.0,
  green: 1.0,
  blue: 1.15,
  purple: 1.30,
  orange: 1.50,
  red: 1.75,
};

/** The rarities an item with a prefix or suffix can roll, for calculator dropdowns. */
export const RARITY_OPTIONS: { value: Exclude<ItemRarity, 'common'>; label: string }[] = [
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'red', label: 'Red' },
];

const CONDITIONED_PROMOTION: Record<ItemRarity, ItemRarity> = {
  common: 'common',
  green: 'blue',
  blue: 'purple',
  purple: 'orange',
  orange: 'red',
  red: 'red',
};

export function getRarityMultiplier(rarity: ItemRarity, conditioned = false): number {
  if (conditioned && rarity === 'red') return 2.0;
  const effectiveRarity = conditioned ? CONDITIONED_PROMOTION[rarity] : rarity;
  return RARITY_MULTIPLIERS[effectiveRarity];
}
