import React, { useMemo, useState } from 'react';
import { findDungeonEnemy } from '@site/src/data/dungeons';
import type { DungeonEnemy as DungeonEnemyData } from '@site/src/types/dungeons';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import { turmaTeamFromRecord } from '@site/src/services/combat/turmaTeam';
import { attackAvailability } from './attackAvailability';
import BossAbilitiesWarning from './BossAbilitiesWarning';
import DungeonAttackModal from './DungeonAttackModal';
import DungeonEnemyCard from './DungeonEnemyCard';
import styles from './Dungeon.module.css';

/** Attack, for a logged-in visitor: their Turma team against this enemy. */
function AttackButton({ enemy }: { readonly enemy: DungeonEnemyData }) {
  const { character } = useActiveCharacter();
  const availability = useMemo(() => (character ? attackAvailability(turmaTeamFromRecord(character, 'attacker')) : null), [character]);
  const [isReportOpen, setReportOpen] = useState(false);
  if (!availability) return null;

  return (
    <>
      <BossAbilitiesWarning enemy={enemy} />
      <button
        className={`awesome-button big ${styles.attack}`}
        disabled={!availability.enabled}
        title={'reason' in availability ? availability.reason : undefined}
        onClick={() => setReportOpen(true)}
      >
        Attack
      </button>
      {isReportOpen && 'fighters' in availability && (
        <DungeonAttackModal team={availability.fighters} enemy={enemy} onClose={() => setReportOpen(false)} />
      )}
    </>
  );
}

/** A dungeon page's enemy card (from the dungeon data), with an Attack button for logged-in visitors. */
export default function DungeonEnemy({ slug, enemy: enemyId }: { readonly slug: string; readonly enemy: string }) {
  const enemy = findDungeonEnemy(slug, enemyId);
  if (!enemy) return <p className={styles.missing}>Unknown enemy: {slug}/{enemyId}</p>;

  return (
    <DungeonEnemyCard enemy={enemy}>
      <AttackButton enemy={enemy} />
    </DungeonEnemyCard>
  );
}
