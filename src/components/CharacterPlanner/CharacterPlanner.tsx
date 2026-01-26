import React, { useState } from 'react';
import styles from './CharacterPlanner.module.css';
import CharacterDoll from './CharacterDoll';
import StatsDisplay from './StatsDisplay';
import ItemSelector from './ItemSelector';
import { useCharacterState, ItemSlotType } from './useCharacterState';

/**
 * Main Character Planner Component
 * Allows users to plan their character build by equipping items and viewing stats
 * Supports URL sharing for builds
 */
export default function CharacterPlanner() {
  const {
    equippedItems,
    characterLevel,
    setCharacterLevel,
    setItem,
    removeItem,
    clearAll,
    characterStats,
    shareUrl,
  } = useCharacterState();

  const [selectedSlot, setSelectedSlot] = useState<ItemSlotType | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleSlotClick = (slot: ItemSlotType) => {
    setSelectedSlot(slot);
  };

  const handleSlotRemove = (slot: ItemSlotType) => {
    removeItem(slot);
  };

  const handleItemSelect = (item: any) => {
    if (selectedSlot) {
      setItem(selectedSlot, item);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard && shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareDialog(true);
        setTimeout(() => setShowShareDialog(false), 3000);
      }
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback: show the URL in a prompt
      prompt('Copy this URL to share your build:', shareUrl);
    }
  };

  const equippedCount = equippedItems.size;

  return (
    <div className={styles.characterPlanner}>
      <div className={styles.header}>
        <h1 className={styles.title}>Character Planner</h1>
        <p className={styles.subtitle}>
          Click equipment slots to add items.
        </p>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.info}>
          <div className={styles.levelSelector}>
            <label htmlFor="character-level">Character Level:</label>
            <input
              id="character-level"
              type="number"
              min="1"
              max="150"
              value={characterLevel}
              onChange={(e) => {
                const value = Number.parseInt(e.target.value, 10);
                if (value >= 1 && value <= 150) {
                  setCharacterLevel(value);
                }
              }}
              className={styles.levelInput}
            />
          </div>
          <span className={styles.equippedCount}>
            {equippedCount} / 9 items equipped
          </span>
        </div>
        
        <div className={styles.actions}>
          <button 
            className={styles.clearButton}
            onClick={clearAll}
            disabled={equippedCount === 0}
            title="Remove all items"
          >
            Clear All
          </button>
          
          <button 
            className={styles.shareButton}
            onClick={handleShare}
            disabled={equippedCount === 0}
            title="Copy shareable URL"
          >
            📋 Share Build
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Character Doll */}
        <div className={styles.dollSection}>
          <CharacterDoll
            equippedItems={equippedItems}
            onSlotClick={handleSlotClick}
            onSlotRemove={handleSlotRemove}
          />
        </div>

        {/* Stats Display */}
        <div className={styles.statsSection}>
          <StatsDisplay stats={characterStats} />
          
          {/* Tips */}
          <div className={styles.tips}>
            <h4>Tips:</h4>
            <ul>
              <li>Click on any equipment slot to add an item</li>
              <li>Hover over items to see detailed stats</li>
              <li>Use the Share button to get a URL for your build</li>
              <li>Red ✕ button on equipped items removes them</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Item Selection Modal */}
      {selectedSlot && (
        <ItemSelector
          slotType={selectedSlot}
          characterLevel={characterLevel}
          onSelect={handleItemSelect}
          onClose={() => setSelectedSlot(null)}
        />
      )}

      {/* Share Success Notification */}
      {showShareDialog && (
        <div className={styles.notification}>
          ✓ Build URL copied to clipboard!
        </div>
      )}
    </div>
  );
}
