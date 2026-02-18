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
 * Unicode-safe base64 encoding
 * Handles special characters, emojis, and international characters
 */
function safeBase64Encode(str: string): string {
  // Convert string to UTF-8 bytes, then to base64
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
    return String.fromCharCode(Number.parseInt(p1, 16));
  }));
}

/**
 * Unicode-safe base64 decoding
 * Handles special characters, emojis, and international characters
 */
function safeBase64Decode(str: string): string {
  // Decode from base64 to UTF-8 bytes, then to string
  return decodeURIComponent(Array.prototype.map.call(atob(str), (c: string) => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
}

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
  const [shareMessage, setShareMessage] = useState('');

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
      console.log('handleShare: Encoding build JSON, length:', json.length);
      const encoded = safeBase64Encode(json);
      const statsJson = JSON.stringify(baseStats);
      console.log('handleShare: Encoding stats JSON:', statsJson);
      const statsEncoded = safeBase64Encode(statsJson);

      const url = new URL(globalThis.window.location.href);
      url.searchParams.set('build', encoded);
      url.searchParams.set('level', characterLevel.toString());
      url.searchParams.set('stats', statsEncoded);
      const shareableUrl = url.toString();

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareableUrl);
        setShareMessage('Build URL copied to clipboard!');
        setShowShareDialog(true);
        setTimeout(() => setShowShareDialog(false), 3000);
      }
    } catch (error) {
      console.error('Failed to copy URL:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      // Fallback: show the URL in a prompt
      const itemsObj: Record<string, any> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });
      const json = JSON.stringify(itemsObj);
      const encoded = safeBase64Encode(json);
      const statsJson = JSON.stringify(baseStats);
      const statsEncoded = safeBase64Encode(statsJson);
      const url = new URL(globalThis.window.location.href);
      url.searchParams.set('build', encoded);
      url.searchParams.set('level', characterLevel.toString());
      url.searchParams.set('stats', statsEncoded);
      prompt('Copy this URL to share your build:', url.toString());
    }
  };

  const handleShareString = async () => {
    try {
      const itemsObj: Record<string, any> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });

      const json = JSON.stringify(itemsObj);
      const encoded = safeBase64Encode(json);
      const statsJson = JSON.stringify(baseStats);
      const statsEncoded = safeBase64Encode(statsJson);

      // Build query string without the base URL
      const queryString = `build=${encoded}&level=${characterLevel}&stats=${statsEncoded}`;

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(queryString);
        setShareMessage('Query string copied to clipboard!');
        setShowShareDialog(true);
        setTimeout(() => setShowShareDialog(false), 3000);
      }
    } catch (error) {
      console.error('Failed to copy query string:', error);
      const itemsObj: Record<string, any> = {};
      equippedItems.forEach((item, slot) => {
        itemsObj[slot] = item;
      });
      const json = JSON.stringify(itemsObj);
      const encoded = safeBase64Encode(json);
      const statsJson = JSON.stringify(baseStats);
      const statsEncoded = safeBase64Encode(statsJson);
      const queryString = `build=${encoded}&level=${characterLevel}&stats=${statsEncoded}`;
      prompt('Copy this query string:', queryString);
    }
  };

  const equippedCount = equippedItems.size;

  // Calculate item level ranges based on character level
  // Maximum level of item we can equip
  const maxUsableItemLevel = characterLevel >= 33 
    ? characterLevel + 16 
    : Math.ceil(1.25 * characterLevel + 7.75);
  
  // Maximum level seen on the market
  const maxMarketItemLevel = characterLevel >= 36 
    ? characterLevel + 9 
    : Math.floor(1.25 * characterLevel);
  
  // Minimum level seen in auctions
  const minAuctionItemLevel = Math.floor(0.75 * characterLevel);
  
  // Maximum level seen in auctions
  const maxAuctionItemLevel = characterLevel >= 33 
    ? characterLevel + 14 
    : Math.ceil(1.25 * characterLevel + 5.75);

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
              Can see items on the market up to <strong>{maxMarketItemLevel}</strong> level (can be increased with Praetor's seal).
            </div>
            <div className={styles.levelInfoItem}>
              Can see items on the auction from <strong>{minAuctionItemLevel}</strong> to <strong>{maxAuctionItemLevel}</strong> level (can be increased with Praetor's seal).
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
          ✓ {shareMessage}
        </div>
      )}
    </div>
  );
}
