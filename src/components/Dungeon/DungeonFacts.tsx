import React from 'react';
import Link from '@docusaurus/Link';
import { findDungeon } from '@site/src/data/dungeons';
import type { DungeonLink, LevelsFact } from '@site/src/types/dungeons';
import type { Range } from '@site/src/types/expeditions';
import styles from './Dungeon.module.css';

const NO_PREVIOUS = 'None, this is the first dungeon in the game';
const NO_NEXT = 'None, this is the last and the highest level dungeon in the game';

const UNKNOWN_LEVELS = '???-???';

const formatRange = (range: Range): string => (range.min === range.max ? String(range.min) : `${range.min}-${range.max}`);

/** "88-100 ✓ Verified", "262-268?" (uncertain), "???-???" (unknown) — as the page wrote it. */
function LevelsLine({ label, fact }: { readonly label: string; readonly fact: LevelsFact }) {
  const levels = fact.levels ? formatRange(fact.levels) : UNKNOWN_LEVELS;
  return (
    <p>
      {label}: <strong>{levels}{fact.status === 'uncertain' && '?'}</strong>
      {fact.status === 'verified' && <> <code>✓</code> Verified</>}
    </p>
  );
}

/** "Fairground (Level 80, Africa)" */
function LinkWithLevel({ link }: { readonly link: DungeonLink }) {
  const details = [link.level !== null && `Level ${link.level}`, link.country].filter(Boolean).join(', ');
  return (
    <>
      <Link to={link.path}>{link.name}</Link>
      {details && ` (${details})`}
    </>
  );
}

function LinkList({ links, none }: { readonly links: DungeonLink[]; readonly none: string }) {
  if (links.length === 0) return <strong>{none}</strong>;
  return (
    <>
      {links.map((link, index) => (
        <React.Fragment key={link.path}>
          {index > 0 && ' or '}
          <LinkWithLevel link={link} />
        </React.Fragment>
      ))}
    </>
  );
}

/** The facts at the top of a dungeon page, from the dungeon data. */
export default function DungeonFacts({ slug }: { readonly slug: string }) {
  const dungeon = findDungeon(slug);
  if (!dungeon) return <p className={styles.missing}>Unknown dungeon: {slug}</p>;

  return (
    <>
      <p>Entry level: <strong>{dungeon.entryLevel}</strong></p>
      {dungeon.dungeonPoints !== null && <p>Dungeon points to complete: <strong>{dungeon.dungeonPoints}</strong></p>}
      <LevelsLine label="Enemy and boss levels" fact={dungeon.enemyLevels} />
      <LevelsLine label="Minions item level drop" fact={dungeon.minionDrop} />
      <LevelsLine label="Boss item level drop" fact={dungeon.bossDrop} />
      {dungeon.parentExpedition && <p>Parent Expedition: <LinkWithLevel link={dungeon.parentExpedition} /></p>}
      <p>
        Advanced Dungeon:{' '}
        {dungeon.advancedDungeon && <><strong>Yes,</strong> <LinkWithLevel link={dungeon.advancedDungeon} /></>}
        {dungeon.advancedDungeonOf && <><strong>This is the Advanced Dungeon of</strong> <LinkWithLevel link={dungeon.advancedDungeonOf} /></>}
        {!dungeon.advancedDungeon && !dungeon.advancedDungeonOf && <strong>No</strong>}
      </p>
      <p>Previous Dungeon: <LinkList links={dungeon.previousDungeons} none={NO_PREVIOUS} /></p>
      <p>Next Dungeon: <LinkList links={dungeon.nextDungeons} none={NO_NEXT} /></p>
    </>
  );
}
