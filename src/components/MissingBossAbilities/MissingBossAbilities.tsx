import React from 'react';
import Link from '@docusaurus/Link';
import {
  allDungeons,
  hasNoAbilitiesRecorded,
  missingDataAnchor,
  unconfirmedAbilities,
  unknownAbilities,
} from '@site/src/data/dungeons';
import type { Dungeon, DungeonAbility, DungeonEnemy } from '@site/src/types/dungeons';

type BossEntry = { dungeon: Dungeon; boss: DungeonEnemy };

const BOSSES: BossEntry[] = allDungeons().flatMap((dungeon) =>
  dungeon.enemies.filter((enemy) => enemy.isBoss).map((boss) => ({ dungeon, boss })));

/** "Round 1, 19, 37 or every 18 rounds", as the boss pages write it */
function scheduleText(ability: DungeonAbility): string {
  const rounds = `Round ${ability.rounds.join(', ')}`;
  return ability.repeatEvery ? `${rounds} or every ${ability.repeatEvery} rounds` : rounds;
}

function BossHeading({ entry }: { readonly entry: BossEntry }) {
  return (
    <h3 id={missingDataAnchor(entry.boss)}>
      {entry.boss.name} — <Link to={`/dungeons/${entry.dungeon.slug}`}>{entry.dungeon.name}</Link> (Level {entry.dungeon.entryLevel})
    </h3>
  );
}

/** The notes' markdown is just **bold** (the game's other wording, quoted): odd pieces are bold. */
function NotesText({ notes }: { readonly notes: string }) {
  return <>{notes.split('**').map((piece, index) => (index % 2 === 1 ? <strong key={index}>{piece}</strong> : piece))}</>;
}

function AbilityItem({ ability }: { readonly ability: DungeonAbility }) {
  return (
    <li>
      <strong>{scheduleText(ability)}:</strong> {ability.gameText}
      {ability.notes && <><br /><em>What players have seen:</em> <NotesText notes={ability.notes} /></>}
    </li>
  );
}

/**
 * The dungeon bosses whose abilities we can't simulate yet, built from the dungeon data:
 * a boss leaves this list once all its abilities have effects.
 */
export default function MissingBossAbilities() {
  const unknown = BOSSES.filter(({ boss }) => unknownAbilities(boss).length > 0);
  const unconfirmed = BOSSES.filter(({ boss }) => unconfirmedAbilities(boss).length > 0);
  const unrecorded = BOSSES.filter(({ boss }) => hasNoAbilitiesRecorded(boss));

  return (
    <>
      <p>
        These bosses have abilities we don’t know well enough to simulate: what they do, how much, or how
        often they work. A boss is only simulated with its abilities once every one of them is known, so
        until then the simulator fights these bosses without any of their abilities.
      </p>
      {unknown.map((entry) => (
        <section key={entry.boss.id}>
          <BossHeading entry={entry} />
          <ul>
            {unknownAbilities(entry.boss).map((ability) => <AbilityItem key={ability.gameText} ability={ability} />)}
          </ul>
        </section>
      ))}

      <h3>Effects nobody has seen yet</h3>
      <p>These bosses are simulated, but one of their abilities only costs them their turn because no report shows it doing anything.</p>
      {unconfirmed.map((entry) => (
        <section key={entry.boss.id}>
          <BossHeading entry={entry} />
          <ul>
            {unconfirmedAbilities(entry.boss).map((ability) => <AbilityItem key={ability.gameText} ability={ability} />)}
          </ul>
        </section>
      ))}

      <h3>No abilities recorded</h3>
      <p>Their pages list no abilities. They may have none, or nobody has written them down yet.</p>
      <ul>
        {unrecorded.map(({ dungeon, boss }) => (
          <li key={boss.id} id={missingDataAnchor(boss)}>
            {boss.name} — <Link to={`/dungeons/${dungeon.slug}`}>{dungeon.name}</Link> (Level {dungeon.entryLevel})
          </li>
        ))}
      </ul>
    </>
  );
}
