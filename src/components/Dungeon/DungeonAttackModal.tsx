import React, { useMemo } from 'react';
import type { DungeonEnemy } from '@site/src/types/dungeons';
import { IMAGE_CDN_PREFIX } from '@site/src/components/EnemyPortrait/EnemyPortrait';
import ReportModal from '@site/src/components/AttackModal/ReportModal';
import TurmaBattleReport from '@site/src/components/TurmaBattleReport/TurmaBattleReport';
import { simulateTeamFight } from '@site/src/services/combat/simulateTeamFight';
import { DUNGEON_RULES } from '@site/src/services/combat/dungeonRules';
import { dungeonEnemyToFighter } from '@site/src/services/combat/dungeonEnemy';
import type { TeamFighter } from '@site/src/services/combat/teamTypes';

/** The enemy as the lone defender of a fight, with its portrait for the report. */
export function dungeonEnemyFighter(enemy: DungeonEnemy): TeamFighter {
  return dungeonEnemyToFighter(enemy, `${IMAGE_CDN_PREFIX}${enemy.image}`);
}

/** One fight of your Turma team against the enemy, run when the report opens. */
export default function DungeonAttackModal({ team, enemy, onClose }: {
  readonly team: TeamFighter[];
  readonly enemy: DungeonEnemy;
  readonly onClose: () => void;
}) {
  const log = useMemo(() => simulateTeamFight(team, [dungeonEnemyFighter(enemy)], DUNGEON_RULES), [team, enemy]);
  return (
    <ReportModal title={`Attacking ${enemy.name}`} onClose={onClose}>
      <TurmaBattleReport log={log} teamTitles={{ attackers: `${team[0]?.name}'s team`, defenders: enemy.name }} />
    </ReportModal>
  );
}
