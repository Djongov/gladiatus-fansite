import React from 'react';
import type { Tactic, TeamFighter } from '@site/src/services/combat/teamTypes';
import styles from './TurmaTeamColumn.module.css';

const ICON_BASE_URL = 'https://gladiatusfansite.blob.core.windows.net/images/Mercenary';

/** Each class's icon and short name, and the game's own tactic text (tooltip). */
export const TACTIC_ICONS: Record<Tactic, { src: string; role: string; label: string }> = {
  tank: { src: `${ICON_BASE_URL}/Merc_Tank.png`, role: 'Tank', label: 'Direct attention to oneself' },
  damage: { src: `${ICON_BASE_URL}/Merc_Damage.png`, role: 'Damage', label: 'Dish out damage' },
  healer: { src: `${ICON_BASE_URL}/Merc_Healer.png`, role: 'Healer', label: 'Heal group members' },
};

/** The icon shows what the mercenary is; the badge shows the tactic it was given. */
function FighterCard({ fighter }: { readonly fighter: TeamFighter }) {
  const tactic = TACTIC_ICONS[fighter.tactic];
  const mercenaryClass = fighter.mercenaryClass && TACTIC_ICONS[fighter.mercenaryClass];
  return (
    <div className={styles.card}>
      <div className={styles.portrait}>{fighter.image && <img src={fighter.image} alt="" loading="lazy" />}</div>
      <div className={styles.details}>
        <div className={styles.name}>
          {mercenaryClass && (
            <img className={styles.tacticIcon} src={mercenaryClass.src} alt={mercenaryClass.role} title={`${mercenaryClass.role} mercenary`} />
          )}
          {fighter.name}
          <span className={`${styles.role} ${styles[fighter.tactic]}`} title={tactic.label}>
            {tactic.role}
          </span>
          <span className={styles.level}>Level {fighter.level}</span>
        </div>
        <dl className={styles.stats}>
          <div><dt>Life points</dt><dd>{fighter.maxLife.toLocaleString()}</dd></div>
          <div><dt>Damage</dt><dd>{fighter.damageMin} - {fighter.damageMax}</dd></div>
          <div><dt>Armour</dt><dd>{fighter.armour.toLocaleString()}</dd></div>
          <div><dt>Threat</dt><dd>{fighter.threatStat.toLocaleString()}</dd></div>
        </dl>
      </div>
    </div>
  );
}

/** One side of a Turma fight: a card per fighter with its tactic and headline stats. */
export default function TurmaTeamColumn({ title, fighters }: { readonly title: string; readonly fighters: TeamFighter[] }) {
  return (
    <section className={styles.column}>
      <h2 className={styles.title}>{title}</h2>
      {fighters.map((fighter) => (
        <FighterCard key={fighter.id} fighter={fighter} />
      ))}
    </section>
  );
}
