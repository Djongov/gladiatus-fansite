import React, { useEffect, useState } from 'react';
import type { Dispatch } from 'react';
import { useActiveCharacter, type ActiveCharacterRecord } from '@site/src/hooks/useActiveCharacter';
import { decodeCharacterState, type useCharacterState } from './useCharacterState';
import { EMPTY_TEAM, encodeTeamState, teamFromStored, type TeamAction } from './useTeamState';

type CharacterState = Pick<
  ReturnType<typeof useCharacterState>,
  'equippedItems' | 'baseStats' | 'characterLevel' | 'activePacts' | 'importProfile' | 'resetCharacter'
>;

const isUntouched = ({ equippedItems, baseStats, characterLevel, activePacts }: CharacterState): boolean =>
  equippedItems.size === 0 &&
  characterLevel === 1 &&
  activePacts.size === 0 &&
  Object.values(baseStats).every((value) => value === 5);

type BuildParams = { s: string | null; t: string | null };

/** True when the URL's build is exactly what the planner writes for this stored character (absent params match). */
export function urlMatchesActiveCharacter(params: BuildParams, record: ActiveCharacterRecord): boolean {
  const characterMatches = !params.s || params.s === record.encoded;
  const teamMatches = !params.t || params.t === encodeTeamState(teamFromStored(record.turma));
  return characterMatches && teamMatches;
}

/**
 * Loads the logged-in player's active character into a page's character state, unless the
 * page was opened with a shared build (`?s=`) or the state has already been changed.
 *
 * @param withItems false keeps the character's attributes but leaves the doll empty
 *   (the Optimal Build Simulation finds its own items)
 * @param team the Character Planner's team: also loads the imported Turma profile and mercenaries
 */
export function useActiveCharacterPrefill(
  state: CharacterState,
  { withItems, team }: { withItems: boolean; team?: Dispatch<TeamAction> },
) {
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const { character: activeCharacter } = useActiveCharacter();
  // Read once on mount: the pages write their own build into `?s=` / `?t=` as soon as they render
  const [openedWith] = useState<BuildParams>(() => {
    if (globalThis.window === undefined) return { s: null, t: null };
    const params = new URLSearchParams(globalThis.window.location.search);
    return { s: params.get('s'), t: params.get('t') };
  });
  const openedWithSharedBuild = !!openedWith.s || !!openedWith.t;

  useEffect(() => {
    if (!activeCharacter) return;
    // A reload or bookmark of the page's own URL is the logged-in character again, not someone's shared build
    const reopenedOwnBuild = openedWithSharedBuild && urlMatchesActiveCharacter(openedWith, activeCharacter) && !prefilledFrom;
    if (!reopenedOwnBuild && (openedWithSharedBuild || !isUntouched(state))) return;

    try {
      const decoded = decodeCharacterState(activeCharacter.encoded, '');
      if (!decoded) return;
      state.importProfile(decoded.level, decoded.baseStats, withItems ? decoded.items : new Map(), decoded.identity, decoded.pacts);
      team?.({ type: 'load', state: teamFromStored(activeCharacter.turma) });
      setPrefilledFrom(activeCharacter.identity.name);
    } catch (err) {
      console.warn('[ActiveCharacterPrefill] failed to decode active character; skipping auto-load:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCharacter]);

  const startFresh = () => {
    state.resetCharacter();
    team?.({ type: 'load', state: EMPTY_TEAM });
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
