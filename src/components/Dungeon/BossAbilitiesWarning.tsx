import React from 'react';
import Link from '@docusaurus/Link';
import {
  hasNoAbilitiesRecorded,
  missingDataAnchor,
  unconfirmedAbilities,
  unknownAbilities,
} from '@site/src/data/dungeons';
import type { DungeonEnemy } from '@site/src/types/dungeons';
import styles from './Dungeon.module.css';

const MISSING_DATA_PAGE = '/data-missing';

/** What the simulator doesn't know about this boss, or null when it knows everything. */
function warningText(enemy: DungeonEnemy): string | null {
  const unknown = unknownAbilities(enemy).length;
  if (unknown > 0) {
    const abilities = unknown === 1 ? '1 of its abilities is' : `${unknown} of its abilities are`;
    return `${abilities} not worked out yet, so the simulator fights this boss without any of its abilities. The real fight is harder.`;
  }
  const unconfirmed = unconfirmedAbilities(enemy).length;
  if (unconfirmed > 0) {
    const abilities = unconfirmed === 1 ? '1 ability has' : `${unconfirmed} abilities have`;
    return `${abilities} an effect nobody has seen yet; the simulator only lets it cost the boss its turn.`;
  }
  if (hasNoAbilitiesRecorded(enemy)) {
    return 'No special abilities are recorded for this boss. If it has any, the simulator doesn’t use them.';
  }
  return null;
}

/** A warning above the Attack button for a boss whose abilities the simulator can't fully fight. */
export default function BossAbilitiesWarning({ enemy }: { readonly enemy: DungeonEnemy }) {
  const text = warningText(enemy);
  if (!text) return null;
  return (
    <div className={`alert alert--warning ${styles.warning}`} role="note">
      {text}{' '}
      <Link to={`${MISSING_DATA_PAGE}#${missingDataAnchor(enemy)}`}>What’s missing</Link>
    </div>
  );
}
