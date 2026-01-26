import React from 'react';
import styles from './ItemSlot.module.css';
import { EquippedItem } from './useCharacterState';
import Item from '../Item';

export interface ItemSlotProps {
  readonly slotName: string;
  readonly item: EquippedItem | null;
  readonly onClick: () => void;
  readonly onRemove?: () => void;
  readonly position: { top: number; left: number };
  readonly size?: 'small' | 'normal' | 'tall';
}

/**
 * Represents a single equipment slot on the character doll
 * Shows equipped item or an empty slot
 */
export default function ItemSlot({ slotName, item, onClick, onRemove, position, size = 'normal' }: ItemSlotProps) {
  let sizeClass = '';
  if (size === 'small') {
    sizeClass = styles.smallSlot;
  } else if (size === 'tall') {
    sizeClass = styles.tallSlot;
  }
  
  return (
    <div 
      className={`${styles.itemSlot} ${sizeClass}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      title={slotName}
    >
      <div 
        className={styles.slotContainer} 
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        tabIndex={0}
      >
        {item ? (
          <div className={styles.equippedItem}>
            <Item
              baseItem={item.baseItem}
              prefix={item.prefix}
              suffix={item.suffix}
              rarity={item.rarity}
              conditioned={item.conditioned}
            />
          </div>
        ) : (
          <div className={styles.emptySlot}>
            <span className={styles.slotIcon}>+</span>
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
