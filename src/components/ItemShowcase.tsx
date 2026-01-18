import React from 'react';
import Item, { ItemRarity, BaseItem } from './Item';
import basesData from '@site/static/data/items/bases.json';

interface ItemShowcaseProps {
  baseItem?: string; // Individual item name
  baseItemType?: 'weapons' | 'shields' | 'armor' | 'helmets' | 'gloves' | 'shoes' | 'rings' | 'amulets'; // Item type to show all
  showAllRarities?: boolean; // If true, shows all rarities. If false, just shows the base item
  showConditioned?: boolean; // If true, shows conditioned variants
  showMaterials?: boolean; // If true, shows materials needed to craft
}

const rarityColors: Record<ItemRarity, string> = {
  common: '#ffffff',
  green: '#1eff00',
  blue: '#0070dd',
  purple: '#a335ee',
  orange: '#ff8000',
  red: '#ff0000',
};

const rarityNames: Record<ItemRarity, string> = {
  common: 'Common',
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  orange: 'Orange',
  red: 'Red',
};

/**
 * ItemShowcase component - displays items with optional rarity variants
 * Can show a single item or all items of a specific type
 */
export default function ItemShowcase({
  baseItem,
  baseItemType,
  showAllRarities = false,
  showConditioned = false,
  showMaterials = false,
}: ItemShowcaseProps) {
  const rarities: ItemRarity[] = ['common', 'green', 'blue', 'purple', 'orange', 'red'];

  // Get items to display
  let itemsToDisplay: BaseItem[] = [];
  
  if (baseItemType) {
    // Filter all items by type
    itemsToDisplay = (basesData as BaseItem[]).filter(item => item.type === baseItemType);
  } else if (baseItem) {
    // Single item
    const item = (basesData as BaseItem[]).find(item => item.name === baseItem);
    if (item) itemsToDisplay = [item];
  }

  if (!showAllRarities) {
    // Just show the base items
    return (
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
        {itemsToDisplay.map((item) => (
          <div key={item.name}>
            <Item baseItem={item.name} />
            {showMaterials && Object.keys(item.materials).length > 0 && (
              <div style={{ fontSize: '12px', marginTop: '5px', color: '#c2a66a' }}>
                {Object.entries(item.materials).map(([material, quantity]) => (
                  <div key={material}>{quantity}× {material}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Show all rarity variants with labels
  return (
    <div style={{ marginTop: '20px' }}>
      {itemsToDisplay.map((item) => (
        <div key={item.name} style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px', fontSize: '18px' }}>{item.name}</h3>
          
          {showMaterials && Object.keys(item.materials).length > 0 && (
            <div style={{ fontSize: '13px', marginBottom: '10px', color: '#121212' }}>
              <strong>Materials:</strong> {Object.entries(item.materials).map(([material, quantity]) => 
                `${quantity}× ${material}`
              ).join(', ')}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {rarities.map((rarity) => (
              <React.Fragment key={`${item.name}-${rarity}`}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <Item baseItem={item.name} rarity={rarity} />
                  <span style={{ color: rarityColors[rarity], fontSize: '13px', fontWeight: 'bold' }}>
                    {rarityNames[rarity]}
                  </span>
                </div>
                {showConditioned && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <Item baseItem={item.name} rarity={rarity} conditioned={true} />
                    <span style={{ color: rarityColors[rarity], fontSize: '13px', fontWeight: 'bold' }}>
                      {rarityNames[rarity]}+
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
