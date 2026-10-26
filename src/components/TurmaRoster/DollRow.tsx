import React from 'react';
import CharacterDoll from '@site/src/components/CharacterPlanner/CharacterDoll';
import CustomItemTooltip from '@site/src/components/CustomItemTooltip';
import type { BaseStats, CharacterStats, EquippedItem, ItemSlotType } from '@site/src/components/CharacterPlanner/useCharacterState';
import type { DollStats, MercenaryContract } from '@site/src/components/CharacterPlanner/turmaTypes';
import CharStatsPanel from './CharStatsPanel';
import styles from './TurmaRoster.module.css';

function contractTooltipLines(contract: MercenaryContract): string[] {
  const lines: Array<[string, number | null]> = [
    ['Life points', contract.lifePoints],
    ['Strength', contract.strength],
    ['Dexterity', contract.dexterity],
    ['Agility', contract.agility],
    ['Constitution', contract.constitution],
    ['Charisma', contract.charisma],
    ['Intelligence', contract.intelligence],
  ];
  // As in the game's contract tooltip: "Life points: 9072", plain numbers
  return lines.filter(([, value]) => value !== null).map(([label, value]) => `${label}: ${value}`);
}

const CONTRACT_STAT_COLOUR = '#BA9700';

type DollRowProps = {
  readonly name: string;
  readonly level: number;
  readonly roleLabel: string;
  readonly portraitUrl: string | null;
  readonly items: Map<ItemSlotType, EquippedItem>;
  readonly baseStats: BaseStats;
  readonly stats?: DollStats;
  /** Chances calculated with the Character Planner's formulas (critical hit, block, crit avoidance, threat) */
  readonly derived?: CharacterStats;
  readonly contract?: MercenaryContract;
};

/** One doll of the roster: portrait, read-only gear doll, then name, role and combat stats. */
export default function DollRow({ name, level, roleLabel, portraitUrl, items, baseStats, stats, derived, contract }: DollRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.portrait}>
        {portraitUrl && <img src={portraitUrl} alt={`${name} portrait`} />}
      </div>

      <CharacterDoll equippedItems={items} characterLevel={level} characterBaseStats={baseStats} />

      <div className={styles.details}>
        <div className={styles.name}>
          {name} · Level {level}
        </div>
        <div className={styles.role}>{roleLabel}</div>
        <CharStatsPanel level={level} stats={stats} derived={derived} />
        {contract && (
          <div className={styles.contract}>
            <CustomItemTooltip
              name={contract.name}
              rarity={contract.rarity}
              spriteClass={`item-i-${contract.baseItemId}`}
              level={contract.level}
              stats={contractTooltipLines(contract)}
              statsColor={CONTRACT_STAT_COLOUR}
              gold={contract.gold.toLocaleString()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** A slim dashed row standing in for a doll that is empty or couldn't be loaded. */
export function PlaceholderRow({ message }: { readonly message: string }) {
  return <div className={styles.placeholderRow}>{message}</div>;
}
