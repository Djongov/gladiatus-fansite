import React, { useEffect, useState } from 'react';
import styles from './CharacterPlanner.module.css';
import CharacterDoll from './CharacterDoll';
import StatsDisplay from './StatsDisplay';
import ItemSelector from './ItemSelector';
import BaseStatsEditor from './BaseStatsEditor';
import ImportProfile from './ImportProfile';
import PlayerName from './PlayerName';
import { useCharacterState, ItemSlotType } from './useCharacterState';
import PactSelector, { ActivePactsBar } from './PactSelector';
import { useActiveCharacterPrefill, PrefilledBanner } from './ActiveCharacterPrefill';
import {
  maxUsableItemLevel,
  maxMarketItemLevel,
  minAuctionItemLevel,
  maxAuctionItemLevel,
} from '@site/src/utils/itemLevelLimits';

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
    resetCharacter,
    characterStats,
    importProfile,
    activePacts,
    togglePact,
  } = useCharacterState();

  const { prefilledFrom, startFresh } = useActiveCharacterPrefill(
    { equippedItems, baseStats, characterLevel, activePacts, importProfile, resetCharacter },
    { withItems: true },
  );

  const [selectedSlot, setSelectedSlot] = useState<ItemSlotType | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const [strictItemLevel, setStrictItemLevel] = useState<boolean>(() => {
    if (globalThis.window === undefined) return false;
    return globalThis.localStorage.getItem('gladiatus.planner.strictItemLevel') === 'true';
  });

  useEffect(() => {
    if (globalThis.window === undefined) return;
    globalThis.localStorage.setItem(
      'gladiatus.planner.strictItemLevel',
      String(strictItemLevel),
    );
  }, [strictItemLevel]);

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
    // The URL is always kept up to date by the state effect in useCharacterState
    const shareableUrl = globalThis.window.location.href;
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setShareMessage('Build URL copied to clipboard!');
      setShowShareDialog(true);
      setTimeout(() => setShowShareDialog(false), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      prompt('Copy this URL to share your build:', shareableUrl);
    }
  };

  const handleShareString = async () => {
    // Extract just the query string from the current URL
    const queryString = globalThis.window.location.search.slice(1);
    try {
      await navigator.clipboard.writeText(queryString);
      setShareMessage('Query string copied to clipboard!');
      setShowShareDialog(true);
      setTimeout(() => setShowShareDialog(false), 3000);
    } catch (error) {
      console.error('Failed to copy query string:', error);
      prompt('Copy this query string:', queryString);
    }
  };

  const equippedCount = equippedItems.size;

  // Item-level limits derived from character level (see src/utils/itemLevelLimits.ts)
  const maxUsableItemLevelValue = maxUsableItemLevel(characterLevel);
  const maxMarketItemLevelValue = maxMarketItemLevel(characterLevel);
  const minAuctionItemLevelValue = minAuctionItemLevel(characterLevel);
  const maxAuctionItemLevelValue = maxAuctionItemLevel(characterLevel);

  return (
    <div className={styles.characterPlanner}>
      <div className={styles.header}>
        <h1 className={styles.title}>Character Planner</h1>
        <p className={styles.subtitle}>
          Click equipment slots to add items.
        </p>
      </div>

      {prefilledFrom && <PrefilledBanner name={prefilledFrom} onClear={startFresh} />}

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
              Can use items up to <strong>{maxUsableItemLevelValue}</strong> level.
            </div>
            <div className={styles.levelInfoItem}>
              Can see items on the market up to <strong>{maxMarketItemLevelValue}</strong> level (can be increased with Praetor's seal).
            </div>
            <div className={styles.levelInfoItem}>
              Can see items on the auction from <strong>{minAuctionItemLevelValue}</strong> to <strong>{maxAuctionItemLevelValue}</strong> level (can be increased with Praetor's seal).
            </div>
            <div className={styles.strictToggle}>
              <label>
                <input
                  type="checkbox"
                  checked={strictItemLevel}
                  onChange={(e) => setStrictItemLevel(e.target.checked)}
                />
                {' '}<span className={styles.newBadge}>New</span> Strict item level — only show wearable combinations
              </label>
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
          
          <button 
            className={styles.shareButton}
            onClick={handleShareString}
            disabled={equippedCount === 0}
            title="Copy query string only (for CompactBuildDisplay)"
          >
            📋 Share String
          </button>
        </div>
      </div>

      <div className={styles.content}>
        {/* Active Pacts Display */}
        <ActivePactsBar
          activePacts={activePacts}
          togglePact={togglePact}
          baseStats={baseStats}
          characterLevel={characterLevel}
          baseHealthFromConstitution={characterStats.baseHealthFromConstitution}
        />

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

        {/* Pact Activation */}
        <PactSelector
          activePacts={activePacts}
          togglePact={togglePact}
          characterLevel={characterLevel}
          baseStats={baseStats}
          baseHealthFromConstitution={characterStats.baseHealthFromConstitution}
        />

        {/* Bottom Section: All Stats */}
        <div className={styles.statsSection}>
          <BaseStatsEditor
            baseStats={baseStats}
            setBaseStats={setBaseStats}
            characterStats={characterStats}
            characterLevel={characterLevel}
            activePacts={activePacts}
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
          strictItemLevel={strictItemLevel}
        />
      )}

      {/* Share Success Notification */}
      {showShareDialog && (
        <div className={styles.notification}>
          ✓ {shareMessage}
        </div>
      )}
    </div>
  );
}
