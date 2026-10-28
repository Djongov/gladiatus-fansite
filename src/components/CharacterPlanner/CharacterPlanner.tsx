import React, { useEffect, useRef, useState } from 'react';
import styles from './CharacterPlanner.module.css';
import CharacterDoll from './CharacterDoll';
import StatsDisplay from './StatsDisplay';
import ItemSelector from './ItemSelector';
import BaseStatsEditor from './BaseStatsEditor';
import ImportProfile from './ImportProfile';
import PlayerName from './PlayerName';
import { useCharacterState, ItemSlotType } from './useCharacterState';
import type { BaseStats, CharacterIdentity, EquippedItem } from './useCharacterState';
import type { ImportDetails } from './fetchCharacterProfile';
import type { PactId } from './PactDefinitions';
import { EMPTY_TEAM, encodeTeamState, memberDoll, teamFromStored, teamFromUrlParam, useTeamState } from './useTeamState';
import type { CharacterBasics } from './useTeamState';
import TeamMemberSection from './TeamMemberSection';
import Link from '@docusaurus/Link';
import { toStoredTurma, useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
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
    setCharacterLevel: setLevelOnly,
    setBaseStats: setBaseStatsOnly,
    setCharacterGender: setGenderOnly,
    setItem: setItemOnly,
    removeItem: removeItemOnly,
    clearAll: clearAllOnly,
    resetCharacter,
    characterStats,
    importProfile,
    activePacts,
    togglePact: togglePactOnly,
  } = useCharacterState();

  const { team, dispatch: dispatchTeam } = useTeamState();

  const { prefilledFrom, startFresh } = useActiveCharacterPrefill(
    { equippedItems, baseStats, characterLevel, activePacts, importProfile, resetCharacter },
    { withItems: true, team: dispatchTeam },
  );

  // Section 1 counts as edited unless it is exactly the logged-in character, untouched since loading
  const [characterTouched, setCharacterTouched] = useState(false);
  useEffect(() => setCharacterTouched(false), [prefilledFrom]);
  const characterEdited = !prefilledFrom || characterTouched;
  /** Every section-1 edit; level, base stats and pacts are shared with the Turma profile */
  const touchCharacter = (sharedWithTurmaProfile: boolean) => {
    setCharacterTouched(true);
    if (sharedWithTurmaProfile) dispatchTeam({ type: 'characterChanged' });
  };
  const setCharacterLevel = (level: number) => { touchCharacter(true); setLevelOnly(level); };
  const setBaseStats = (stats: Partial<BaseStats>) => { touchCharacter(true); setBaseStatsOnly(stats); };
  const togglePact = (id: PactId) => { touchCharacter(true); togglePactOnly(id); };
  const setCharacterGender = (gender: 'male' | 'female') => { touchCharacter(false); setGenderOnly(gender); };
  const setItem = (slot: ItemSlotType, item: EquippedItem | null) => { touchCharacter(false); setItemOnly(slot, item); };
  const removeItem = (slot: ItemSlotType) => { touchCharacter(false); removeItemOnly(slot); };
  const clearAll = () => { touchCharacter(false); clearAllOnly(); };
  /** A profile loaded here replaces section 1 and brings its own Turma, keeping that profile's game numbers */
  const importProfileWithTeam = (
    level: number, stats: BaseStats, items: Map<ItemSlotType, EquippedItem>, identity: CharacterIdentity,
    pacts: Set<PactId> | undefined, _profileUrl: string, details?: ImportDetails,
  ) => {
    setCharacterTouched(true);
    importProfile(level, stats, items, identity, pacts);
    dispatchTeam({ type: 'load', state: teamFromStored(details?.turma ? toStoredTurma(details.turma) : undefined) });
  };

  // The team travels in the `t` URL param beside the character's `s`
  const teamLoadedFromUrl = useRef(false);
  useEffect(() => {
    if (globalThis.window === undefined) return;
    const param = new URLSearchParams(globalThis.window.location.search).get('t');
    if (param) dispatchTeam({ type: 'load', state: teamFromUrlParam(param) });
    teamLoadedFromUrl.current = true;
  }, [dispatchTeam]);
  useEffect(() => {
    if (globalThis.window === undefined || !teamLoadedFromUrl.current) return;
    const url = new URL(globalThis.window.location.href);
    if (team === EMPTY_TEAM) url.searchParams.delete('t');
    else url.searchParams.set('t', encodeTeamState(team));
    globalThis.window.history.replaceState({}, '', url.toString());
  }, [team]);

  const characterBasics: CharacterBasics = { level: characterLevel, baseStats, pacts: activePacts };

  const { character: activeCharacter, importBuild } = useActiveCharacter();
  const handleImportBuild = () => {
    importBuild({
      level: characterLevel,
      baseStats,
      identity: characterIdentity,
      items: equippedItems,
      pacts: activePacts,
      characterEdited,
      team,
    });
    setShareMessage('Build imported: every simulator now uses it');
    setShowShareDialog(true);
    setTimeout(() => setShowShareDialog(false), 3000);
  };

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
        <ImportProfile onImport={importProfileWithTeam} />
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

      <div className={styles.importBuild}>
        <button className={styles.shareButton} onClick={handleImportBuild} title="Use this build in every simulator">
          <span className={styles.newBadge}>New</span> Import this build
        </button>
        <p>
          Replaces your imported profile with this build: your character and the whole Turma team.{' '}
          {activeCharacter?.profileUrl
            ? <>To get your real profile back, use the refresh button on <Link to="/character">/character</Link>.</>
            : <>To get your real profile back, load it again on <Link to="/character">/character</Link>.</>}
          <br />
          <strong>Tip:</strong> this way you can use this Character Planner build in all simulators.
        </p>
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

      {/* Circus Turma team: Turma profile and four mercenaries, stacked under the character */}
      <div className={styles.team}>
        <TeamMemberSection
          title="Turma profile"
          memberRef="turmaProfile"
          member={team.turmaProfile}
          doll={memberDoll(team.turmaProfile, 'turmaProfile', characterBasics)}
          strictItemLevel={strictItemLevel}
          dispatch={dispatchTeam}
        />
        {([0, 1, 2, 3] as const).map((index) => {
          const member = team.mercenaries[index];
          const doll = memberDoll(member, 'mercenary', characterBasics);
          const name = doll?.contract?.name ?? member.stored?.identity.name;
          const title = name && doll ? `Mercenary ${index + 1} · ${name} · Level ${doll.level}` : `Mercenary ${index + 1} · empty`;
          return (
            <TeamMemberSection
              key={index}
              title={title}
              memberRef={index}
              member={member}
              doll={doll}
              strictItemLevel={strictItemLevel}
              dispatch={dispatchTeam}
            />
          );
        })}
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
