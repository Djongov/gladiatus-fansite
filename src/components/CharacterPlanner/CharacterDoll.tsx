import React from 'react';
import styles from './CharacterDoll.module.css';
import ItemSlot from './ItemSlot';
import { ItemSlotType, EquippedItem } from './useCharacterState';

interface CharacterDollProps {
  readonly equippedItems: Map<ItemSlotType, EquippedItem>;
  readonly onSlotClick: (slot: ItemSlotType) => void;
  readonly onSlotRemove: (slot: ItemSlotType) => void;
}

/**
 * Slot positions based on the gladiatus character doll image
 * Positions are approximate and can be adjusted
 */
const SLOT_POSITIONS: Record<ItemSlotType, { top: number; left: number }> = {
  helmet: { top: 20, left: 100 },
  amulet: { top: 52, left: 180 },
  chest: { top: 90, left: 100 },
  gloves: { top: 200, left: 22 },
  mainHand: { top: 90, left: 22 },
  offHand: { top: 90, left: 181 },
  ring1: { top: 200, left: 180 },
  ring2: { top: 200, left: 215 },
  shoes: { top: 200, left: 100 },
};

const SLOT_LABELS: Record<ItemSlotType, string> = {
  helmet: 'Helmet',
  amulet: 'Amulet',
  chest: 'Chest Armor',
  gloves: 'Gloves',
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
  ring1: 'Ring 1',
  ring2: 'Ring 2',
  shoes: 'Shoes',
};

/**
 * Character doll component showing all equipment slots
 * Uses the gladiatus character doll as background with overlaid item slots
 */
export default function CharacterDoll({ equippedItems, onSlotClick, onSlotRemove }: CharacterDollProps) {
  return (
    <div className={styles.characterDoll}>
      <div className={styles.dollContainer}>
        {/* Background character image */}
        <img 
          src="https://gladiatusfansite.blob.core.windows.net/images/doll.jpg" 
          alt="Character Doll"
          className={styles.dollImage}
        />
        
        {/* Equipment slots overlay */}
        <div className={styles.slotsOverlay}>
          {(Object.keys(SLOT_POSITIONS) as ItemSlotType[]).map((slot) => {
            // Determine size based on slot type
            let size: 'small' | 'normal' | 'tall' = 'normal';
            if (slot === 'amulet' || slot === 'ring1' || slot === 'ring2') {
              size = 'small';
            } else if (slot === 'mainHand' || slot === 'offHand' || slot === 'chest') {
              size = 'tall';
            }
            
            return (
              <ItemSlot
                key={slot}
                slotName={SLOT_LABELS[slot]}
                item={equippedItems.get(slot) || null}
                onClick={() => onSlotClick(slot)}
                onRemove={() => onSlotRemove(slot)}
                position={SLOT_POSITIONS[slot]}
                size={size}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
