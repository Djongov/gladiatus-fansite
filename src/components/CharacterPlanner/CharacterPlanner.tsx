import React, { useState } from 'react';
import styles from './CharacterPlanner.module.css';
import CharacterDoll from './CharacterDoll';
import StatsDisplay from './StatsDisplay';
import ItemSelector from './ItemSelector';
import BaseStatsEditor from './BaseStatsEditor';
import ImportProfile from './ImportProfile';
import PlayerName from './PlayerName';
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
    baseStats,
    characterIdentity,
    setCharacterLevel,
    setBaseStats,
    setCharacterGender,
    setItem,
    removeItem,
    clearAll,
    characterStats,
    importProfile,
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
      // Generate URL with current state to ensure it's up-to-date
      const itemsObj: Record<string, any> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });

      const json = JSON.stringify(itemsObj);
      const encoded = btoa(json);

      const url = new URL(globalThis.window.location.href);
      url.searchParams.set('build', encoded);
      url.searchParams.set('level', characterLevel.toString());
      const shareableUrl = url.toString();

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareableUrl);
        setShowShareDialog(true);
        setTimeout(() => setShowShareDialog(false), 3000);
      }
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Fallback: show the URL in a prompt
      const itemsObj: Record<string, any> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });
      const json = JSON.stringify(itemsObj);
      const encoded = btoa(json);
      const url = new URL(globalThis.window.location.href);
      url.searchParams.set('build', encoded);
      url.searchParams.set('level', characterLevel.toString());
      prompt('Copy this URL to share your build:', url.toString());
    }
  };

  const equippedCount = equippedItems.size;

  // Calculate item level ranges based on character level
  const maxUsableItemLevel = characterLevel + 16;
  const maxMarketItemLevel = characterLevel + 9;
  const minAuctionItemLevel = characterLevel - 22;
  const maxAuctionItemLevel = characterLevel + 14;

  return (
    <div className={styles.characterPlanner}>
      <div className={styles.header}>
        <h1 className={styles.title}>Character Planner</h1>
        <p className={styles.subtitle}>
          Click equipment slots to add items.
        </p>
      </div>

      {/* Import Profile */}
      <div className={styles.importSection}>
        <ImportProfile onImport={importProfile} />
      </div>

      <div className={styles.toolbar}>
        <div className={styles.info}>
          <div className={styles.levelSelector}>
            <label htmlFor="character-level">Character Level:</label>
            <input
              id="character-level"
              type="number"
              min="1"
              max="1000"
              value={characterLevel}
              onChange={(e) => {
                const value = Number.parseInt(e.target.value, 10);
                if (value >= 1 && value <= 1000) {
                  setCharacterLevel(value);
                }
              }}
              className={styles.levelInput}
            />
          </div>
          <div className={styles.levelInfo}>
            <div className={styles.levelInfoItem}>
              Can use items up to <strong>{maxUsableItemLevel}</strong> level.
            </div>
            <div className={styles.levelInfoItem}>
              Can see items on the market up to <strong>{maxMarketItemLevel}</strong> level.
            </div>
            <div className={styles.levelInfoItem}>
              Can see items on the auction from <strong>{minAuctionItemLevel}</strong> to <strong>{maxAuctionItemLevel}</strong> level.
            </div>
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
        {/* Top Section: Character Identity and Doll */}
        <div className={styles.topSection}>
          <div className={styles.characterIdentity}>
            <PlayerName 
              identity={characterIdentity} 
              characterLevel={characterLevel}
              onGenderChange={setCharacterGender}
            />
          </div>
          
          <div className={styles.dollSection}>
            <CharacterDoll
              equippedItems={equippedItems}
              onSlotClick={handleSlotClick}
              onSlotRemove={handleSlotRemove}
              characterLevel={characterLevel}
              characterBaseStats={baseStats}
            />
          </div>
        </div>

        {/* Bottom Section: All Stats */}
        <div className={styles.statsSection}>
          <BaseStatsEditor
            baseStats={baseStats}
            setBaseStats={setBaseStats}
            characterStats={characterStats}
            characterLevel={characterLevel}
          />
          
          <StatsDisplay stats={characterStats} />
          
          {/* Tips */}
          <div className={styles.tips}>
            <h4>Tips:</h4>
            <ul>
              <li>Click on any equipment slot to add or edit items</li>
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
          currentItem={equippedItems.get(selectedSlot) || null}
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
