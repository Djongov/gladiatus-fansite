import React from 'react';
import { ATTRIBUTE_KEYS } from '@site/src/components/CharacterPlanner/turmaTypes';
import type { AttributeKey, AttributeStat, DollStats } from '@site/src/components/CharacterPlanner/turmaTypes';
import type { CharacterStats } from '@site/src/components/CharacterPlanner/useCharacterState';
import styles from './CharStatsPanel.module.css';

const MISSING_VALUE = '—';

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  agility: 'Agility',
  constitution: 'Constitution',
  charisma: 'Charisma',
  intelligence: 'Intelligence',
};

type TooltipLine = { readonly text: string; readonly highlight?: boolean };

function StatTooltip({ lines }: { readonly lines: TooltipLine[] }) {
  return (
    <span className={styles.tooltip}>
      {lines.map((line) => (
        <span key={line.text} className={line.highlight ? styles.tooltipHighlight : styles.tooltipLine}>
          {line.text}
        </span>
      ))}
    </span>
  );
}

function attributeTooltipLines(label: string, attribute: AttributeStat): TooltipLine[] {
  const lines: TooltipLine[] = [{ text: `${label}: ${attribute.total}`, highlight: true }, { text: `Basic: ${attribute.base}` }];
  if (attribute.max !== null) lines.push({ text: `Maximum: ${attribute.max}` });
  if (attribute.itemsApplied !== null && attribute.itemsPossible !== null) {
    lines.push({ text: `Through items: +${attribute.itemsApplied} from +${attribute.itemsPossible}` });
  }
  return lines;
}

/** A row with a bar, like the game's life points and primary stats (charstats_text + charstats_balken). */
export function BarRow({
  label,
  value,
  fillPercent,
  bar,
  tooltipLines,
}: {
  readonly label: string;
  readonly value: string;
  readonly fillPercent: number;
  readonly bar: 'life' | 'attribute';
  readonly tooltipLines?: TooltipLine[];
}) {
  return (
    <div className={styles.row}>
      <span className={styles.text}>{label}</span>
      <div className={styles.barTrack}>
        <div className={bar === 'life' ? styles.lifeBar : styles.attributeBar} style={{ width: `${Math.max(0, Math.min(100, fillPercent))}%` }} />
      </div>
      <span className={styles.barValue}>{value}</span>
      {tooltipLines && <StatTooltip lines={tooltipLines} />}
    </div>
  );
}

/** A plain label/value row, like the game's level, armour and damage (charstats_value21/22). */
export function ValueRow({
  label,
  value,
  tooltipLines,
}: {
  readonly label: string;
  readonly value: string;
  readonly tooltipLines?: TooltipLine[];
}) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      {tooltipLines && <StatTooltip lines={tooltipLines} />}
    </div>
  );
}

// Same rounding as the Character Planner's stats panel
const formatChance = (chance: number): string => `${Math.ceil(chance)}%`;

/** Chances the game shows only in tooltips, calculated with the Character Planner's formulas. */
function DerivedChanceRows({ derived }: { readonly derived: CharacterStats }) {
  return (
    <>
      <ValueRow
        label="Critical hit"
        value={formatChance(derived.criticalHitChance)}
        tooltipLines={[
          { text: `Critical attack value: ${derived.totalCriticalAttack} / ${derived.maxCriticalAttack}`, highlight: true },
          { text: `From Dexterity: ${derived.criticalAttackFromDexterity}` },
          { text: `From items: ${derived.criticalAttackFromItems}` },
          { text: `Chance for critical hit: ${formatChance(derived.criticalHitChance)}` },
        ]}
      />
      <ValueRow
        label="Block"
        value={formatChance(derived.blockChance)}
        tooltipLines={[
          { text: `Block value: ${derived.totalBlocking} / ${derived.maxBlocking}`, highlight: true },
          { text: `From Strength: ${derived.blockingFromStrength}` },
          { text: `From items: ${derived.blockingFromItems}` },
          { text: `Chance to block: ${formatChance(derived.blockChance)}` },
        ]}
      />
      <ValueRow
        label="Crit avoidance"
        value={formatChance(derived.critAvoidanceChance)}
        tooltipLines={[
          { text: `Resilience: ${derived.totalResilience} / ${derived.maxResilience}`, highlight: true },
          { text: `From Agility: ${derived.resilienceFromAgility}` },
          { text: `From items: ${derived.resilienceFromItems}` },
          { text: `Chance to avoid critical hits: ${formatChance(derived.critAvoidanceChance)}` },
        ]}
      />
    </>
  );
}

/** The panel's frame (#charstats): its top and bottom edges around the rows. */
export function StatPanelFrame({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className={styles.panel}>
      <div className={styles.top} />
      {children}
      <div className={styles.bottom} />
    </div>
  );
}

const formatValue = (value: number | null | undefined): string => (typeof value === 'number' ? String(value) : MISSING_VALUE);

/**
 * The game's character stat panel (#charstats), filled with the imported values.
 * `derived` (Character Planner formulas) adds the chances the game only shows in tooltips.
 */
export default function CharStatsPanel({
  level,
  stats,
  derived,
}: {
  readonly level: number;
  readonly stats?: DollStats;
  readonly derived?: CharacterStats;
}) {
  // The game's own threat when the import has it; otherwise calculated from Charisma and items
  const threat = stats?.threat ?? derived?.totalThreat ?? null;
  const threatTooltip: TooltipLine[] | undefined = derived && [
    { text: `Threat: ${threat}`, highlight: true },
    { text: `From Charisma: ${derived.threatFromCharisma}` },
    { text: `From items: ${derived.threatFromItems}` },
  ];
  const damage =
    stats?.damageMin != null && stats.damageMax != null ? `${stats.damageMin} - ${stats.damageMax}` : MISSING_VALUE;

  return (
    <StatPanelFrame>
      <ValueRow label="Level" value={String(level)} />
      <BarRow
        label="Life points"
        value={formatValue(stats?.lifePoints)}
        fillPercent={100}
        bar="life"
        tooltipLines={stats?.lifePoints == null ? undefined : [{ text: `Life points: ${stats.lifePoints}`, highlight: true }]}
      />
      {ATTRIBUTE_KEYS.map((key) => {
        const attribute = stats?.attributes?.[key];
        const label = ATTRIBUTE_LABELS[key];
        return (
          <BarRow
            key={key}
            label={label}
            value={formatValue(attribute?.total)}
            fillPercent={attribute?.max ? (attribute.total / attribute.max) * 100 : 0}
            bar="attribute"
            tooltipLines={attribute ? attributeTooltipLines(label, attribute) : undefined}
          />
        );
      })}
      <ValueRow label="Armour" value={formatValue(stats?.armour)} />
      <ValueRow label="Damage" value={damage} />
      <ValueRow label="Threat" value={formatValue(threat)} tooltipLines={threatTooltip} />
      <ValueRow label="Healing" value={formatValue(stats?.healing)} />
      {derived && <DerivedChanceRows derived={derived} />}
    </StatPanelFrame>
  );
}
