import React, { useState, useMemo } from 'react';
import styles from './ItemSelector.module.css';
import { ItemSlotType, EquippedItem } from './useCharacterState';
import Item, { BaseItem, PrefixSuffix, ItemRarity } from '../Item';
import basesData from '@site/static/data/items/bases.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';

interface ItemSelectorProps {
  readonly slotType: ItemSlotType;
  readonly characterLevel: number;
  readonly onSelect: (item: EquippedItem) => void;
  readonly onClose: () => void;
}

// Map slot types to item types
const SLOT_TYPE_MAP: Record<ItemSlotType, string[]> = {
  helmet: ['helmets'],
  amulet: ['amulets'],
  chest: ['armour'],
  gloves: ['gloves'],
  mainHand: ['weapons'],
  offHand: ['shields'],
  ring1: ['rings'],
  ring2: ['rings'],
  shoes: ['shoes'],
};

/**
 * Modal for selecting items to equip
 * Shows filterable list of base items with options for prefix/suffix/rarity
 */
export default function ItemSelector({ slotType, characterLevel, onSelect, onClose }: ItemSelectorProps) {
  const [selectedBase, setSelectedBase] = useState<BaseItem | null>(null);
  const [selectedPrefix, setSelectedPrefix] = useState<PrefixSuffix | null>(null);
  const [selectedSuffix, setSelectedSuffix] = useState<PrefixSuffix | null>(null);
  const [selectedRarity, setSelectedRarity] = useState<ItemRarity>('green');
  const [conditioned, setConditioned] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  // Get available base items for this slot type
  const availableBaseItems = useMemo(() => {
    const allowedTypes = SLOT_TYPE_MAP[slotType];
    return (basesData as BaseItem[]).filter(item => 
      allowedTypes.includes(item.type) && (item.level || 0) <= characterLevel
    );
  }, [slotType, characterLevel]);

  // Filter items based on search and level
  const filteredItems = useMemo(() => {
    return availableBaseItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === null || item.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [availableBaseItems, searchTerm, levelFilter]);

  // Get available prefixes/suffixes - filter by character level
  const availablePrefixes = useMemo(() => {
    return (prefixesData as PrefixSuffix[]).filter(
      prefix => prefix.level <= characterLevel
    );
  }, [characterLevel]);

  const availableSuffixes = useMemo(() => {
    return (suffixesData as PrefixSuffix[]).filter(
      suffix => suffix.level <= characterLevel
    );
  }, [characterLevel]);

  const handleEquip = () => {
    if (!selectedBase) return;

    const equippedItem: EquippedItem = {
      baseItem: selectedBase,
      prefix: selectedPrefix || undefined,
      suffix: selectedSuffix || undefined,
      rarity: selectedRarity,
      conditioned,
    };

    onSelect(equippedItem);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3>Select Item for {slotType}</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* Step 1: Select Base Item */}
          <div className={styles.section}>
            <h4>1. Choose Base Item</h4>
            
            <div className={styles.filters}>
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              
              <select
                value={levelFilter || ''}
                onChange={(e) => setLevelFilter(e.target.value ? Number(e.target.value) : null)}
                className={styles.levelFilter}
              >
                <option value="">All Levels</option>
                {Array.from(new Set(availableBaseItems.map(i => i.level)))
                  .sort((a, b) => (a || 0) - (b || 0))
                  .map(level => (
                    <option key={level} value={level || ''}>Level {level}</option>
                  ))}
              </select>
            </div>

            <div className={styles.itemList}>
              {filteredItems.map((item) => (
                <div
                  key={item.name}
                  className={`${styles.itemCard} ${selectedBase?.name === item.name ? styles.selected : ''}`}
                  onClick={() => setSelectedBase(item)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedBase(item)}
                  tabIndex={0}
                >
                  <img src={item.image} alt={item.name} className={styles.itemImage} />
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{item.name}</div>
                    <div className={styles.itemLevel}>Level {item.level}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Customize Item */}
          {selectedBase && (
            <div className={styles.section}>
              <h4>2. Customize Item</h4>
              
              <div className={styles.customization}>
                {/* Prefix Selection */}
                <div className={styles.customField}>
                  <label htmlFor="prefix-select">Prefix (Optional):</label>
                  <select
                    id="prefix-select"
                    value={selectedPrefix?.name || ''}
                    onChange={(e) => {
                      const prefix = availablePrefixes.find(p => p.name === e.target.value);
                      setSelectedPrefix(prefix || null);
                    }}
                    className={styles.select}
                  >
                    <option value="">None</option>
                    {availablePrefixes.map((prefix) => (
                      <option key={prefix.name} value={prefix.name}>
                        {prefix.name} (Lvl {prefix.level})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Suffix Selection */}
                <div className={styles.customField}>
                  <label htmlFor="suffix-select">Suffix (Optional):</label>
                  <select
                    id="suffix-select"
                    value={selectedSuffix?.name || ''}
                    onChange={(e) => {
                      const suffix = availableSuffixes.find(s => s.name === e.target.value);
                      setSelectedSuffix(suffix || null);
                    }}
                    className={styles.select}
                  >
                    <option value="">None</option>
                    {availableSuffixes.map((suffix) => (
                      <option key={suffix.name} value={suffix.name}>
                        {suffix.name} (Lvl {suffix.level})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rarity Selection */}
                <div className={styles.customField}>
                  <label htmlFor="rarity-select">Rarity:</label>
                  <select
                    id="rarity-select"
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value as ItemRarity)}
                    className={styles.select}
                  >
                    <option value="common">Common</option>
                    <option value="green">Green (Ceres)</option>
                    <option value="blue">Blue (Neptune)</option>
                    <option value="purple">Purple (Mars)</option>
                    <option value="orange">Orange (Jupiter)</option>
                    <option value="red">Red (Vulcan)</option>
                  </select>
                </div>

                {/* Conditioning */}
                <div className={styles.customField}>
                  <label htmlFor="conditioned-checkbox">
                    <input
                      id="conditioned-checkbox"
                      type="checkbox"
                      checked={conditioned}
                      onChange={(e) => setConditioned(e.target.checked)}
                    />
                    {' '}Conditioned (+)
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className={styles.preview}>
                <h5>Preview:</h5>
                <div className={styles.previewItem}>
                  <Item
                    baseItem={selectedBase}
                    prefix={selectedPrefix || undefined}
                    suffix={selectedSuffix || undefined}
                    rarity={selectedRarity}
                    conditioned={conditioned}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button 
            className={styles.equipButton} 
            onClick={handleEquip}
            disabled={!selectedBase}
          >
            Equip Item
          </button>
        </div>
      </div>
    </div>
  );
}
