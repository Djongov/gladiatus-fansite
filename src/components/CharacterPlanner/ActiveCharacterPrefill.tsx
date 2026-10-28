import React, { useEffect, useState } from 'react';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import { decodeCharacterState, type useCharacterState } from './useCharacterState';

type CharacterState = Pick<
  ReturnType<typeof useCharacterState>,
  'equippedItems' | 'baseStats' | 'characterLevel' | 'activePacts' | 'importProfile' | 'resetCharacter'
>;

const isUntouched = ({ equippedItems, baseStats, characterLevel, activePacts }: CharacterState): boolean =>
  equippedItems.size === 0 &&
  characterLevel === 1 &&
  activePacts.size === 0 &&
  Object.values(baseStats).every((value) => value === 5);

/**
 * Loads the logged-in player's active character into a page's character state, unless the
 * page was opened with a shared build (`?s=`) or the state has already been changed.
 *
 * @param withItems false keeps the character's attributes but leaves the doll empty
 *   (the Optimal Build Simulation finds its own items)
 */
export function useActiveCharacterPrefill(state: CharacterState, { withItems }: { withItems: boolean }) {
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const { character: activeCharacter } = useActiveCharacter();
  // Read once on mount: the pages write their own build into `?s=` as soon as they render
  const [openedWithSharedBuild] = useState(
    () => typeof globalThis.window !== 'undefined' && !!new URLSearchParams(globalThis.window.location.search).get('s'),
  );

  useEffect(() => {
    if (openedWithSharedBuild || !activeCharacter || !isUntouched(state)) return;

    try {
      const decoded = decodeCharacterState(activeCharacter.encoded, '');
      if (!decoded) return;
      state.importProfile(decoded.level, decoded.baseStats, withItems ? decoded.items : new Map(), decoded.identity, decoded.pacts);
      setPrefilledFrom(activeCharacter.identity.name);
    } catch (err) {
      console.warn('[ActiveCharacterPrefill] failed to decode active character; skipping auto-load:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharacter]);

  const startFresh = () => {
    state.resetCharacter();
    setPrefilledFrom(null);
  };

  return { prefilledFrom, startFresh };
}

/** "Loaded from <name>" with a link back to a new level 1 character. */
export function PrefilledBanner({ name, onClear }: { readonly name: string; readonly onClear: () => void }) {
  return (
    <div style={{
      marginBottom: 12,
      padding: '8px 12px',
      background: 'var(--ifm-color-emphasis-100)',
      borderLeft: '3px solid #c2a66a',
      fontSize: 14,
    }}>
      Loaded from <strong>{name}</strong>{' '}
      <a href="#" onClick={(e) => { e.preventDefault(); onClear(); }}>
        Clear and start fresh
      </a>
    </div>
  );
}
