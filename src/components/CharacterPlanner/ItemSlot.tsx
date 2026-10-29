import React from 'react';
import styles from './ItemSlot.module.css';
import { EquippedItem, BaseStats } from './useCharacterState';
import Item from '../Item';

export interface ItemSlotProps {
  readonly slotName: string;
  readonly item: EquippedItem | null;
  /** Absent for read-only dolls (e.g. the /character profile): the slot is then not interactive. */
  readonly onClick?: () => void;
  readonly onRemove?: () => void;
  readonly position: { top: number; left: number };
  readonly size?: 'small' | 'normal' | 'tall';
  readonly characterLevel?: number;
  readonly characterBaseStats?: BaseStats;
  readonly showLevelBadge?: boolean;
}

/**
 * Represents a single equipment slot on the character doll
 * Shows equipped item or an empty slot
 */
export default function ItemSlot({ 
  slotName, 
  item, 
  onClick, 
  onRemove, 
  position, 
  size = 'normal',
  characterLevel,
  characterBaseStats,
  showLevelBadge,
}: ItemSlotProps) {
  let sizeClass = '';
  if (size === 'small') {
    sizeClass = styles.smallSlot;
  } else if (size === 'tall') {
    sizeClass = styles.tallSlot;
  }
  
  const interactiveProps = onClick
    ? {
        onClick,
        onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && onClick(),
        tabIndex: 0,
      }
    : {};

  return (
    <div
      className={`${styles.itemSlot} ${sizeClass} ${onClick ? '' : styles.readOnly}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      title={slotName}
    >
      <div
        className={styles.slotContainer}
        {...interactiveProps}
      >
        {item ? (
          <div className={styles.equippedItem}>
            <Item
              baseItem={item.baseItem}
              prefix={item.prefix}
              suffix={item.suffix}
              rarity={item.rarity}
              conditioned={item.conditioned}
              enchantValue={item.enchantValue}
              upgrades={item.upgrades}
              characterLevel={characterLevel}
              characterBaseStats={characterBaseStats}
              showLevelBadge={showLevelBadge}
            />
          </div>
        ) : (
          <div className={styles.emptySlot}>
            {onClick && <span className={styles.slotIcon}>+</span>}
          </div>
        )}
      </div>
      
      {item && onRemove && (
        <button 
          className={styles.removeButton}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove item"
        >
          ×
        </button>
      )}
    </div>
  );
}
