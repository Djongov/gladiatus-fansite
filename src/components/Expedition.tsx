import React, { useState } from 'react';
import Link from '@docusaurus/Link';
import styles from '@site/src/css/Expedition.module.css';
import expeditionsData from '@site/static/data/expeditions.json';
import type {
  ExpeditionsData,
  Expedition as ExpeditionData,
  Enemy,
} from '@site/src/types/expeditions';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import AttackModal from '@site/src/components/AttackModal/AttackModal';
import EnemyPortrait, { IMAGE_CDN_PREFIX } from '@site/src/components/EnemyPortrait/EnemyPortrait';
import { ExpeditionBonusesCell, type BonusId } from '@site/src/components/ExpeditionBonuses/ExpeditionBonuses';
import EnemyStatsPanel from '@site/src/components/EnemyStatsPanel/EnemyStatsPanel';
import { expeditionPanelValues, formatRange } from '@site/src/components/EnemyStatsPanel/expeditionPanelValues';

const ICON_LEVEL = `${IMAGE_CDN_PREFIX}icon_level.gif`;
const ICON_GOLD = `${IMAGE_CDN_PREFIX}icon_gold.gif`;
const ICON_EXP = `${IMAGE_CDN_PREFIX}icon_level_small.gif`;
const ICON_HONOUR = `${IMAGE_CDN_PREFIX}icon_honor_small.gif`;

type ExpeditionProps = {
  slug: string;
};

function findExpedition(slug: string): ExpeditionData | null {
  const data = expeditionsData as ExpeditionsData;
  for (const country of Object.values(data)) {
    for (const exp of country.expeditions) {
      if (exp.slug === slug) return exp;
    }
  }
  return null;
}

function PlayerName({ name }: { name: string }) {
  return (
    <div className="player_name_bg">
      <div className="playername">{name}</div>
    </div>
  );
}

function AttributeCell({ icon, label }: { icon?: string; label: string }) {
  return (
    <td className={styles.attributeCell}>
      {icon && <img src={icon} alt="" className={styles.attributeIcon} />}
      {label}
    </td>
  );
}

function DungeonLine({ label, name, slug }: { label: string; name: string | null; slug: string | null }) {
  return (
    <p className={styles.keyFact}>
      <span className={styles.keyFactLabel}>{label}:</span>{' '}
      {name === null
        ? 'No'
        : slug
          ? <>Yes, <Link to={`/${slug}`}>{name}</Link></>
          : <>Yes, {name}</>}
    </p>
  );
}

export default function Expedition({ slug }: ExpeditionProps) {
  const exp = findExpedition(slug);
  const { character: activeCharacter } = useActiveCharacter();
  const [attackEnemy, setAttackEnemy] = useState<{ enemy: Enemy; bonuses: Set<BonusId> } | null>(null);
  const [bonusesByEnemy, setBonusesByEnemy] = useState<Record<number, Set<BonusId>>>({});

  const toggleBonus = (enemyIndex: number, bonusId: BonusId) => {
    setBonusesByEnemy((prev) => {
      const current = new Set(prev[enemyIndex] ?? new Set<BonusId>());
      if (current.has(bonusId)) current.delete(bonusId);
      else current.add(bonusId);
      return { ...prev, [enemyIndex]: current };
    });
  };
  if (!exp) {
    return <span className={styles.error}>Expedition not found: {slug}</span>;
  }

  return (
    <>
      {exp.description && (
        <>
          <h2>Description</h2>
          <p>{exp.description}</p>
        </>
      )}

      <p className={styles.keyFact}>
        <span className={styles.keyFactLabel}>Entry level:</span> {exp.entryLevel}
      </p>
      <p className={styles.keyFact}>
        <span className={styles.keyFactLabel}>Enemy levels:</span>{' '}
        {exp.enemyLevels.min}-{exp.enemyLevels.max}
      </p>
      <p className={styles.keyFact}>
        <span className={styles.keyFactLabel}>Real level to engage:</span> {exp.realLevelToEngage}
      </p>
      <DungeonLine label="Dungeon" name={exp.dungeon} slug={exp.dungeonSlug} />
      <DungeonLine label="Advanced Dungeon" name={exp.advancedDungeon} slug={exp.advancedDungeonSlug} />

      {exp.additionalInfo && (
        <p className={styles.keyFact}>
          <span className={styles.keyFactLabel}>Additional Info:</span> {exp.additionalInfo}
        </p>
      )}

      <hr />

      <h2>Enemies</h2>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Attribute</th>
            <th>Enemy 1</th>
            <th>Enemy 2</th>
            <th>Enemy 3</th>
            <th>Boss</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <AttributeCell label="Name" />
            {exp.enemies.map((e, i) => (
              <td key={`name-${i}`}><PlayerName name={e.name} /></td>
            ))}
          </tr>
          <tr>
            <AttributeCell label="Image" />
            {exp.enemies.map((e, i) => (
              <td key={`img-${i}`}><EnemyPortrait name={e.name} image={e.image} isBoss={e.isBoss} /></td>
            ))}
          </tr>
          <tr>
            <AttributeCell label="Stats" />
            {exp.enemies.map((e, i) => (
              <td key={`stats-${i}`}><EnemyStatsPanel values={expeditionPanelValues(e)} /></td>
            ))}
          </tr>
          {activeCharacter !== null && (
            <tr>
              <AttributeCell label="Bonuses" />
              {exp.enemies.map((_e, i) => (
                <td key={`bonus-${i}`}>
                  <ExpeditionBonusesCell
                    enemyIndex={i}
                    activeBonuses={bonusesByEnemy[i] ?? new Set<BonusId>()}
                    onToggleBonus={toggleBonus}
                  />
                </td>
              ))}
            </tr>
          )}
          {activeCharacter !== null && (
            <tr>
              <AttributeCell label="Attack" />
              {exp.enemies.map((e, i) => (
                <td key={`atk-${i}`}>
                  {e.life === null ? (
                    <button
                      className="awesome-button big"
                      disabled
                      title="No combat data available for this enemy yet."
                    >
                      Attack
                    </button>
                  ) : (
                    <button
                      className="awesome-button big"
                      onClick={() => setAttackEnemy({
                        enemy: e,
                        bonuses: new Set(bonusesByEnemy[i] ?? new Set<BonusId>()),
                      })}
                    >
                      Attack
                    </button>
                  )}
                </td>
              ))}
            </tr>
          )}
          <tr>
            <AttributeCell icon={ICON_LEVEL} label="Level" />
            {exp.enemies.map((e, i) => <td key={`lvl-${i}`}>{formatRange(e.level)}</td>)}
          </tr>
          <tr>
            <AttributeCell icon={ICON_GOLD} label="Gold" />
            {exp.enemies.map((e, i) => <td key={`gold-${i}`}>{formatRange(e.gold)}</td>)}
          </tr>
          <tr>
            <AttributeCell icon={ICON_EXP} label="Experience" />
            {exp.enemies.map((e, i) => <td key={`exp-${i}`}>{formatRange(e.experience)}</td>)}
          </tr>
          <tr>
            <AttributeCell icon={ICON_HONOUR} label="Honour" />
            {exp.enemies.map((e, i) => <td key={`hon-${i}`}>{formatRange(e.honour)}</td>)}
          </tr>
          <tr>
            <AttributeCell label="Item Level Drop" />
            {exp.enemies.map((e, i) => <td key={`ild-${i}`}>{e.itemLevelDrop === null ? '—' : formatRange(e.itemLevelDrop)}</td>)}
          </tr>
        </tbody>
      </table>
      {attackEnemy && activeCharacter && (
        <AttackModal
          mode="pve"
          enemy={attackEnemy.enemy}
          bonuses={attackEnemy.bonuses}
          character={activeCharacter}
          onClose={() => setAttackEnemy(null)}
        />
      )}
    </>
  );
}
