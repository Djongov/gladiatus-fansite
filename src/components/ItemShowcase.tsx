import React, { useState } from 'react';
import Item, { ItemRarity, BaseItem } from './Item';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';

interface ItemShowcaseProps {
  baseItem?: string; // Individual item name
  baseItemType?: 'weapons' | 'shields' | 'armour' | 'helmets' | 'gloves' | 'shoes' | 'rings' | 'amulets'; // Item type to show all
  showAllRarities?: boolean; // If true, shows all rarities. If false, just shows the base item
  showConditioned?: boolean; // If true, shows conditioned variants
  showMaterials?: boolean; // If true, shows materials needed to craft
  allowPrefixSuffixSelection?: boolean; // If true, allows selecting prefix/suffix to apply to all items
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

// Simple searchable select component
const SearchableSelect = ({ options, value, onChange, placeholder, label }: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  
  const selectedOption = options.find(opt => opt.value === value);
  
  return (
    <div style={{ position: 'relative', marginBottom: '10px' }}>
      <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>{label}</label>
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          style={{ 
            padding: '8px', 
            minWidth: '200px',
            width: '100%',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: '4px',
            backgroundColor: 'var(--ifm-background-color)',
            color: 'var(--ifm-font-color-base)'
          }}
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              setSearch('');
            }}
            style={{
              position: 'absolute',
              right: '5px',
              top: '33px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'var(--ifm-font-color-base)'
            }}
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: '300px',
              overflowY: 'auto',
              backgroundColor: 'var(--ifm-background-color)',
              border: '1px solid var(--ifm-color-emphasis-300)',
              borderRadius: '4px',
              zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }}
          >
            {filteredOptions.map(opt => (
              <div
                key={opt.value + opt.label}
                onClick={() => {
                  onChange(opt.value);
                  setSearch('');
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'var(--ifm-color-emphasis-200)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                {opt.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div style={{ padding: '8px 12px', color: 'var(--ifm-color-emphasis-600)' }}>
                No results found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
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
  allowPrefixSuffixSelection = false,
}: ItemShowcaseProps) {
  const [selectedPrefix, setSelectedPrefix] = useState('');
  const [selectedSuffix, setSelectedSuffix] = useState('');
  
  const allRarities: ItemRarity[] = ['common', 'green', 'blue', 'purple', 'orange', 'red'];
  // Skip common rarity when prefix or suffix is selected (common items can't have affixes)
  const rarities: ItemRarity[] = (selectedPrefix || selectedSuffix) 
    ? allRarities.filter(r => r !== 'common')
    : allRarities;

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
  
  // Prepare prefix/suffix options
  const prefixOptions = [
    { value: '', label: 'None' },
    ...prefixesData.map(p => ({ value: p.name, label: `${p.name} (${p.level})` }))
  ];
  
  const suffixOptions = [
    { value: '', label: 'None' },
    ...suffixesData.map(s => ({ value: s.name, label: `${s.name} (${s.level})` }))
  ];
  
  const prefix = prefixesData.find(p => p.name === selectedPrefix);
  const suffix = suffixesData.find(s => s.name === selectedSuffix);

  if (!showAllRarities) {
    // Just show the base items
    return (
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
        {itemsToDisplay.map((item) => (
          <div key={item.name}>
            <Item 
              baseItem={item.name} 
              prefix={selectedPrefix || undefined}
              suffix={selectedSuffix || undefined}
            />
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
      {/* Prefix/Suffix Selection */}
      {allowPrefixSuffixSelection && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '20px', 
          border: '1px solid var(--ifm-color-emphasis-300)', 
          borderRadius: '8px',
          backgroundColor: 'var(--ifm-background-surface-color)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Apply Prefix/Suffix to All Items</h3>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '200px' }}>
              <SearchableSelect
                options={prefixOptions}
                value={selectedPrefix}
                onChange={setSelectedPrefix}
                placeholder="Search prefix..."
                label="Prefix:"
              />
            </div>
            
            <div style={{ flex: '1', minWidth: '200px' }}>
              <SearchableSelect
                options={suffixOptions}
                value={selectedSuffix}
                onChange={setSelectedSuffix}
                placeholder="Search suffix..."
                label="Suffix:"
              />
            </div>
          </div>
          
          {/* Display selected prefix/suffix stats */}
          {(prefix || suffix) && (
            <div style={{ marginTop: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {prefix && (
                <div>
                  <strong>Prefix: {prefix.name} (Level {prefix.level})</strong>
                  <div style={{ marginTop: '5px', fontSize: '14px' }}>
                    {Object.entries(prefix.stats).map(([stat, value]) => (
                      <div key={stat}>
                        {stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {value.flat !== 0 && ` ${value.flat > 0 ? '+' : ''}${value.flat}`}
                        {value.percent !== 0 && ` ${value.percent > 0 ? '+' : ''}${value.percent}%`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {suffix && (
                <div>
                  <strong>Suffix: {suffix.name} (Level {suffix.level})</strong>
                  <div style={{ marginTop: '5px', fontSize: '14px' }}>
                    {Object.entries(suffix.stats).map(([stat, value]) => (
                      <div key={stat}>
                        {stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {value.flat !== 0 && ` ${value.flat > 0 ? '+' : ''}${value.flat}`}
                        {value.percent !== 0 && ` ${value.percent > 0 ? '+' : ''}${value.percent}%`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {itemsToDisplay.map((item) => (
        <div key={item.name} style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '15px', fontSize: '22px' }}>{item.name}</h2>
          
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
                  <Item 
                    baseItem={item.name} 
                    rarity={rarity} 
                    prefix={selectedPrefix || undefined}
                    suffix={selectedSuffix || undefined}
                  />
                  <span style={{ color: rarityColors[rarity], fontSize: '13px', fontWeight: 'bold' }}>
                    {rarityNames[rarity]}
                  </span>
                </div>
                {showConditioned && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                    <Item 
                      baseItem={item.name} 
                      rarity={rarity} 
                      conditioned={true}
                      prefix={selectedPrefix || undefined}
                      suffix={selectedSuffix || undefined}
                    />
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
