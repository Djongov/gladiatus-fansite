import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import ImportProfile from '@site/src/components/CharacterPlanner/ImportProfile';
import FightControls from '@site/src/components/FightControls/FightControls';
import TurmaTeamColumn from '@site/src/components/TurmaTeam/TurmaTeamColumn';
import ReportModal from '@site/src/components/AttackModal/ReportModal';
import TurmaBattleReport from '@site/src/components/TurmaBattleReport/TurmaBattleReport';
import { simulateTeamFight, simulateTeamOdds } from '@site/src/services/combat/simulateTeamFight';
import { TURMA_RULES } from '@site/src/services/combat/turmaRules';
import { YOUR_TURMA_PROBLEMS, turmaTeamFromImport, turmaTeamFromRecord, type TurmaTeamResult } from '@site/src/services/combat/turmaTeam';
import type { TeamFighter } from '@site/src/services/combat/teamTypes';
import simulatorStyles from '@site/src/css/ArenaSimulator.module.css';
import styles from '@site/src/css/TurmaSimulator.module.css';

const PAGE_TITLE = 'Turma Simulator';
const ESTIMATE_NOTE =
  'Estimate: Turma targeting and threat rules are reverse-engineered from real battle reports, so treat these odds as a guide, not a guarantee.';

const OPPONENT_MESSAGES: Record<Exclude<TurmaTeamResult['status'], 'ok'>, string> = {
  missing: 'This player has no Circus Turma.',
  empty: 'This player has no Circus Turma.',
  locked: "This player's Circus Turma is still locked (it unlocks at level 10).",
  stale: "Couldn't read this player's Turma stats. Try importing again.",
};
const OPPONENT_BUILD_FAILED = "Couldn't set up this player's Turma for a fight.";

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

/** One fight, run when the report opens. */
function TurmaAttackModal({ attackers, defenders, onClose }: {
  readonly attackers: TeamFighter[];
  readonly defenders: TeamFighter[];
  readonly onClose: () => void;
}) {
  const log = useMemo(() => simulateTeamFight(attackers, defenders, TURMA_RULES), [attackers, defenders]);
  return (
    <ReportModal title={`Attacking ${defenders[0]?.name}'s Turma`} onClose={onClose}>
      <TurmaBattleReport log={log} />
    </ReportModal>
  );
}

export default function TurmaSimulatorPage(): React.ReactElement {
  const { character } = useActiveCharacter();
  const yourTeam = useMemo(() => (character ? turmaTeamFromRecord(character, 'attacker') : null), [character]);
  const [opponent, setOpponent] = useState<TeamFighter[] | null>(null);
  const [showReport, setShowReport] = useState(false);

  if (!character || !yourTeam) {
    return (
      <PageShell>
        <div className={simulatorStyles.notice}>
          <p>
            <strong>Load a character first.</strong> The Turma Simulator needs your Circus Turma to simulate fights.
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
          {opponent ? (
            <>
              <TurmaTeamColumn title="Opponent" fighters={opponent} />
              <button type="button" className={simulatorStyles.changeOpponent} onClick={() => setOpponent(null)}>
                Change opponent
              </button>
              <FightControls
                subject="this Turma"
                onAttack={() => setShowReport(true)}
                onSimulate={(sampleSize) => simulateTeamOdds(attackers, opponent, TURMA_RULES, sampleSize)}
                note={ESTIMATE_NOTE}
              />
            </>
          ) : (
            <>
              <h2 className={simulatorStyles.opponentHeading}>Import Opponent</h2>
              <ImportProfile
                onImport={(_level, _baseStats, _items, _identity, pacts, profileUrl, details) => {
                  try {
                    const team = turmaTeamFromImport(details?.turma, pacts, profileUrl, 'defender');
                    if (team.status !== 'ok') return OPPONENT_MESSAGES[team.status];
                    setOpponent(team.fighters);
                  } catch (err) {
                    console.warn('[TurmaSimulator] opponent build failed:', err);
                    return OPPONENT_BUILD_FAILED;
                  }
                }}
              />
            </>
          )}
        </div>
      </div>
      {showReport && opponent && (
        <TurmaAttackModal attackers={attackers} defenders={opponent} onClose={() => setShowReport(false)} />
      )}
    </PageShell>
  );
}
