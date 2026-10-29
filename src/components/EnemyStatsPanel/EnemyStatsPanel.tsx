import React from 'react';
import { ATTRIBUTE_KEYS, type AttributeKey } from '@site/src/components/CharacterPlanner/turmaTypes';
import { ATTRIBUTE_LABELS, BarRow, StatPanelFrame, ValueRow } from '@site/src/components/TurmaRoster/CharStatsPanel';

/** What an enemy's stat panel shows, already formatted: one value, or a range across the enemy's levels. */
export type EnemyPanelValues = {
  /** Omitted where the page shows the level elsewhere (expedition tables) */
  level?: string;
  life: string;
  attributes: Record<AttributeKey, string>;
  armour: string;
  damage: string;
  critChance: string;
  blockChance: string;
  critAvoidChance: string;
  /** Only dungeon enemies' panels show it */
  threat?: string;
};

/** An enemy's stat panel, styled like the game's (dungeon and expedition enemies). Bars are drawn full. */
export default function EnemyStatsPanel({ values }: { readonly values: EnemyPanelValues }) {
  return (
    <StatPanelFrame>
      {values.level !== undefined && <ValueRow label="Level" value={values.level} />}
      <BarRow label="Life points" value={values.life} fillPercent={100} bar="life" />
      {ATTRIBUTE_KEYS.map((key) => (
        <BarRow key={key} label={ATTRIBUTE_LABELS[key]} value={values.attributes[key]} fillPercent={100} bar="attribute" />
      ))}
      <ValueRow label="Armour" value={values.armour} />
      <ValueRow label="Damage" value={values.damage} />
      <ValueRow label="Critical hit" value={values.critChance} />
      <ValueRow label="Block" value={values.blockChance} />
      <ValueRow label="Crit avoidance" value={values.critAvoidChance} />
      {values.threat !== undefined && <ValueRow label="Threat" value={values.threat} />}
    </StatPanelFrame>
  );
}
