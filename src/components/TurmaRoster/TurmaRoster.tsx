import React from 'react';
import { calculateCharacterStats, decodeCharacterState } from '@site/src/components/CharacterPlanner/useCharacterState';
import type { PactId } from '@site/src/components/CharacterPlanner/PactDefinitions';
import type { StoredDoll } from '@site/src/components/CharacterPlanner/turmaTypes';
import type { ActiveCharacterRecord } from '@site/src/hooks/useActiveCharacter';
import { resolveCharacterPortrait } from '@site/src/utils/characterFaceImage';
import { mercenaryPortraitUrl } from '@site/src/utils/mercenaryPortrait';
import DollRow, { PlaceholderRow } from './DollRow';
import styles from './TurmaRoster.module.css';

const MAIN_CHARACTER_LABEL = 'Main character';
const EMPTY_SLOT_MESSAGE = 'No mercenary in this slot';
const FAILED_SLOT_MESSAGE = "Couldn't load this doll — try Refresh profile";
const REFRESH_HINT = 'Refresh your profile to load your Circus Turma.';
const NO_PACTS: Set<PactId> = new Set();

type StoredDollRowProps = {
  readonly doll: StoredDoll;
  readonly isMercenary: boolean;
  readonly profileUrl?: string;
  /** Pacts that apply to this doll (the character's own pacts for the Turma profile, none for mercenaries) */
  readonly pacts: Set<PactId>;
};

function StoredDollRow({ doll, isMercenary, profileUrl, pacts }: StoredDollRowProps) {
  if (doll.status === 'empty') return <PlaceholderRow message={EMPTY_SLOT_MESSAGE} />;
  if (doll.status !== 'ok') return <PlaceholderRow message={FAILED_SLOT_MESSAGE} />;

  const decoded = decodeCharacterState(doll.encoded, doll.identity.name);
  // Corrupt storage costs this one row, never the page
  if (!decoded) return <PlaceholderRow message={FAILED_SLOT_MESSAGE} />;

  const portraitUrl = isMercenary
    ? mercenaryPortraitUrl(profileUrl, doll.contract?.baseItemId)
    : resolveCharacterPortrait({ costume: doll.identity.costume, level: doll.level, gender: doll.identity.gender });

  return (
    <DollRow
      name={doll.identity.name}
      level={doll.level}
      roleLabel={doll.role ?? ''}
      portraitUrl={portraitUrl}
      items={decoded.items}
      baseStats={decoded.baseStats}
      stats={doll.stats}
      derived={calculateCharacterStats(decoded.items, doll.level, decoded.baseStats, pacts)}
      contract={isMercenary ? doll.contract : undefined}
    />
  );
}

/** The logged-in character and their Circus Turma (Turma profile + 4 mercenaries), one doll per row. */
export default function TurmaRoster({ character }: { readonly character: ActiveCharacterRecord }) {
  const main = decodeCharacterState(character.encoded, character.identity.name);
  const { turma } = character;

  return (
    <section className={styles.roster}>
      <div className={styles.label}>{MAIN_CHARACTER_LABEL}</div>
      {main ? (
        <DollRow
          name={character.identity.name}
          level={character.level}
          roleLabel={MAIN_CHARACTER_LABEL}
          portraitUrl={resolveCharacterPortrait({
            costume: character.identity.costume,
            level: character.level,
            gender: character.identity.gender,
          })}
          items={main.items}
          baseStats={main.baseStats}
          stats={character.stats}
          derived={calculateCharacterStats(main.items, character.level, main.baseStats, main.pacts)}
        />
      ) : (
        <PlaceholderRow message={FAILED_SLOT_MESSAGE} />
      )}

      {/* Below the Turma level there's nothing to show, so the section is hidden entirely */}
      {turma?.profile.status !== 'locked' && (
        <>
          <div className={styles.label}>Circus Turma</div>
          {turma ? (
            <>
              {/* The Turma profile is the same character, so the character's pacts apply to it */}
              <StoredDollRow
                doll={turma.profile}
                isMercenary={false}
                profileUrl={character.profileUrl}
                pacts={main?.pacts ?? NO_PACTS}
              />
              {turma.mercenaries.map((mercenary, index) => (
                <StoredDollRow
                  key={`mercenary-${index + 1}`}
                  doll={mercenary}
                  isMercenary
                  profileUrl={character.profileUrl}
                  pacts={NO_PACTS}
                />
              ))}
            </>
          ) : (
            <p className={styles.hint}>{REFRESH_HINT}</p>
          )}
        </>
      )}
    </section>
  );
}
