import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import FightControls from '@site/src/components/FightControls/FightControls';
import TurmaTeamColumn from '@site/src/components/TurmaTeam/TurmaTeamColumn';
import DungeonEnemyCard from '@site/src/components/Dungeon/DungeonEnemyCard';
import BossAbilitiesWarning from '@site/src/components/Dungeon/BossAbilitiesWarning';
import DungeonAttackModal, { dungeonEnemyFighter } from '@site/src/components/Dungeon/DungeonAttackModal';
import { dungeonCountries } from '@site/src/data/dungeons';
import type { CountryKey } from '@site/src/types/dungeons';
import { simulateTeamOdds } from '@site/src/services/combat/simulateTeamFight';
import { DUNGEON_RULES } from '@site/src/services/combat/dungeonRules';
import { YOUR_TURMA_PROBLEMS, turmaTeamFromRecord } from '@site/src/services/combat/turmaTeam';
import simulatorStyles from '@site/src/css/ArenaSimulator.module.css';
import expeditionStyles from '@site/src/css/ExpeditionSimulator.module.css';
import styles from '@site/src/css/TurmaSimulator.module.css';

const PAGE_TITLE = 'Dungeon Simulator';
const ESTIMATE_NOTE =
  'Estimate: the enrage and boss abilities come from a handful of dungeon battle reports, and only the abilities a report has worked out are simulated, so treat these odds as a guide, not a guarantee.';

const COUNTRIES = dungeonCountries();

function PageShell({ children }: { readonly children: React.ReactNode }) {
  return (
    <Layout title={PAGE_TITLE}>
      <div className={simulatorStyles.wrapper}>
        <h1>{PAGE_TITLE}</h1>
        {children}
      </div>
    </Layout>
  );
}

function Dropdown({ id, label, value, onChange, disabled, placeholder, options }: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder: string;
  readonly options: { value: string; label: string }[];
}) {
  return (
    <div className={expeditionStyles.dropdownRow}>
      <label htmlFor={id}>{label}:</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">— {placeholder} —</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

export default function DungeonSimulatorPage(): React.ReactElement {
  const { character } = useActiveCharacter();
  const yourTeam = useMemo(() => (character ? turmaTeamFromRecord(character, 'attacker') : null), [character]);
  const [countryKey, setCountryKey] = useState<CountryKey | ''>('');
  const [dungeonSlug, setDungeonSlug] = useState('');
  const [enemyId, setEnemyId] = useState('');
  const [showReport, setShowReport] = useState(false);

  const country = COUNTRIES.find((candidate) => candidate.key === countryKey) ?? null;
  const dungeon = country?.dungeons.find((candidate) => candidate.slug === dungeonSlug) ?? null;
  const enemy = dungeon?.enemies.find((candidate) => candidate.id === enemyId) ?? null;
  const enemyFighter = useMemo(() => (enemy ? dungeonEnemyFighter(enemy) : null), [enemy]);

  if (!character || !yourTeam) {
    return (
      <PageShell>
        <div className={simulatorStyles.notice}>
          <p>
            <strong>Load a character first.</strong> The Dungeon Simulator fights with your Circus Turma, as dungeons do.
          </p>
          <Link to="/character" className="awesome-button big">Load Character</Link>
        </div>
      </PageShell>
    );
  }

  if (yourTeam.status !== 'ok') {
    return (
      <PageShell>
        <div className={simulatorStyles.notice}>
          <p>{YOUR_TURMA_PROBLEMS[yourTeam.status]}</p>
          <Link to="/character" className="awesome-button big">Character page</Link>
        </div>
      </PageShell>
    );
  }

  const attackers = yourTeam.fighters;

  return (
    <PageShell>
      <div className={styles.layout}>
        <TurmaTeamColumn title="Your Turma" fighters={attackers} />

        <div className={simulatorStyles.opponentColumn}>
          <h2 className={simulatorStyles.opponentHeading}>Choose an Enemy</h2>
          <Dropdown
            id="dungeon-country"
            label="Country"
            value={countryKey}
            placeholder="Select country"
            options={COUNTRIES.map((candidate) => ({ value: candidate.key, label: candidate.name }))}
            onChange={(value) => {
              setCountryKey(value as CountryKey | '');
              setDungeonSlug('');
              setEnemyId('');
            }}
          />
          <Dropdown
            id="dungeon-dungeon"
            label="Dungeon"
            value={dungeonSlug}
            disabled={!country}
            placeholder="Select dungeon"
            options={(country?.dungeons ?? []).map((candidate) => ({
              value: candidate.slug,
              label: `${candidate.name} — Level ${candidate.entryLevel}`,
            }))}
            onChange={(value) => {
              setDungeonSlug(value);
              setEnemyId('');
            }}
          />
          <Dropdown
            id="dungeon-enemy"
            label="Enemy"
            value={enemyId}
            disabled={!dungeon}
            placeholder="Select enemy"
            options={(dungeon?.enemies ?? []).map((candidate) => ({
              value: candidate.id,
              label: `${candidate.name}${candidate.isBoss ? ' (Boss)' : ''} — Level ${candidate.level}`,
            }))}
            onChange={setEnemyId}
          />

          {enemy && enemyFighter && (
            <>
              <DungeonEnemyCard enemy={enemy} />
              <BossAbilitiesWarning enemy={enemy} />
              <FightControls
                key={`${dungeonSlug}/${enemy.id}`}
                subject={enemy.name}
                onAttack={() => setShowReport(true)}
                onSimulate={(sampleSize) => simulateTeamOdds(attackers, [enemyFighter], DUNGEON_RULES, sampleSize)}
                note={ESTIMATE_NOTE}
              />
            </>
          )}
        </div>
      </div>
      {showReport && enemy && (
        <DungeonAttackModal team={attackers} enemy={enemy} onClose={() => setShowReport(false)} />
      )}
    </PageShell>
  );
}
