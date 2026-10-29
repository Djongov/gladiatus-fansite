import React from 'react';
import type { DungeonEnemy } from '@site/src/types/dungeons';
import EnemyPortrait from '@site/src/components/EnemyPortrait/EnemyPortrait';
import EnemyStatsPanel, { type EnemyPanelValues } from '@site/src/components/EnemyStatsPanel/EnemyStatsPanel';
import { ATTRIBUTE_KEYS } from '@site/src/components/CharacterPlanner/turmaTypes';
import styles from './Dungeon.module.css';

/** The enemy's in-game stat panel, as its screenshot showed it. */
function dungeonPanelValues(enemy: DungeonEnemy): EnemyPanelValues {
  return {
    level: String(enemy.level),
    life: String(enemy.life),
    attributes: Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, String(enemy[key])])) as EnemyPanelValues['attributes'],
    armour: `${enemy.armour} (${enemy.armourAbsorb.min} - ${enemy.armourAbsorb.max})`,
    damage: `${enemy.damage.min} - ${enemy.damage.max}`,
    critChance: `${enemy.critChance}%`,
    blockChance: `${enemy.blockChance}%`,
    critAvoidChance: `${enemy.critAvoidChance}%`,
    threat: String(enemy.threat),
  };
}

/** A dungeon enemy as the game shows it: name banner, portrait and stat panel, with `children` (an Attack button) below. */
export default function DungeonEnemyCard({ enemy, children }: { readonly enemy: DungeonEnemy; readonly children?: React.ReactNode }) {
  return (
    <div className={styles.enemy}>
      <div className="player_name_bg">
        <div className="playername">{enemy.name}</div>
      </div>
      <div className={styles.enemyBody}>
        <EnemyPortrait name={enemy.name} image={enemy.image} isBoss={enemy.isBoss} />
        <EnemyStatsPanel values={dungeonPanelValues(enemy)} />
        {children}
      </div>
    </div>
  );
}
