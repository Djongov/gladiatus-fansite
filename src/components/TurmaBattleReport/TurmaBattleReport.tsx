import React, { useState } from 'react';
import { blockChanceAgainst, critHealChance, doubleHitChance, hitChance, ownCritAvoidChance, ownCritChance } from '@site/src/services/combat/teamChances';
import { teamPoints } from '@site/src/services/combat/simulateTeamFight';
import type { FighterSnapshot, SwingEvent, TeamAction, TeamBattleLog, TeamFighter } from '@site/src/services/combat/teamTypes';
import { lifeRows, swingLine, teamMarks, type LifeRow, type ResultLine } from './reportModel';
import shared from '@site/src/components/BattleReport/BattleReport.module.css';
import styles from './TurmaBattleReport.module.css';

const ROUNDS_SHOWN_COLLAPSED = 5;

// Nearest whole percent, which matches the game report's crit and block figures
const formatPercent = (value: number): string => `${Math.round(value)} %`;
const perOpponent = (opponents: TeamFighter[], chance: (opponent: TeamFighter) => number): string =>
  opponents.map((opponent) => Math.round(chance(opponent))).join(' / ') + ' %';

function headerText(log: TeamBattleLog): { text: string; className: string } {
  if (log.outcome === 'attacker_wins') return { text: `Winner: ${log.attackers[0]?.name}`, className: shared.headerWin };
  if (log.outcome === 'defender_wins') return { text: `Winner: ${log.defenders[0]?.name}`, className: shared.headerLoss };
  return { text: 'Draw — both teams scored the same points', className: shared.headerDraw };
}

/* ----- Fighter stat blocks: one column per fighter, chances listed per opponent ----- */

function TeamStatsTable({ team, opponents }: { readonly team: TeamFighter[]; readonly opponents: TeamFighter[] }) {
  const rows: Array<[string, (fighter: TeamFighter) => React.ReactNode]> = [
    ['Level', (f) => f.level],
    ['Life points', (f) => f.maxLife.toLocaleString()],
    ['Strength', (f) => f.strength],
    ['Dexterity', (f) => f.dexterity],
    ['Agility', (f) => f.agility],
    ['Constitution', (f) => f.constitution],
    ['Charisma', (f) => f.charisma],
    ['Intelligence', (f) => f.intelligence],
    ['Armour', (f) => `${f.armour} (${f.armourAbsorbMin} - ${f.armourAbsorbMax})`],
    ['Damage', (f) => `${f.damageMin} - ${f.damageMax}`],
    ['Hit chance', (f) => perOpponent(opponents, (o) => hitChance(f, o))],
    ['Double hit', (f) => perOpponent(opponents, (o) => doubleHitChance(f, o))],
    ['Chance for critical damage', (f) => formatPercent(ownCritChance(f))],
    ['Chance to block a hit', (f) => perOpponent(opponents, (o) => blockChanceAgainst(f, o))],
    ['Chance of avoiding critical hits', (f) => formatPercent(ownCritAvoidChance(f))],
    ['Threat', (f) => f.threatStat],
    ['Healing', (f) => f.healing],
    ['Critical healing', (f) => formatPercent(critHealChance(f))],
  ];
  return (
    <div className={styles.tableScroll}>
      <table className={shared.statsTable}>
        <thead>
          <tr>
            <th />
            {team.map((fighter) => <th key={fighter.id}>{fighter.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label}>
              <th className={styles.rowLabel}>{label}</th>
              {team.map((fighter) => <td key={fighter.id}>{value(fighter)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----- Statistics: the game's "Damage & Healing" table ----- */

const share = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const average = (total: number, count: number): number => (count > 0 ? Math.round(total / count) : 0);

function StatisticsTable({ log }: { readonly log: TeamBattleLog }) {
  const finalThreat = log.rounds.at(-1)?.endOfRound ?? {};
  const renderTeam = (team: TeamFighter[]) => {
    const points = teamPoints(team.map((fighter) => log.totals[fighter.id]));
    return team.map((fighter) => {
      const totals = log.totals[fighter.id];
      const fighterPoints = teamPoints([totals]);
      return (
        <tr key={fighter.id}>
          <th>{fighter.name}</th>
          <td>
            {totals.damageDone}
            <span className={styles.detail}>⚔ {totals.landed} / {totals.swings} ({share(totals.landed, totals.swings)}%)</span>
            <span className={styles.detail}>⦰ {average(totals.damageDone, totals.landed)}</span>
          </td>
          <td>
            {totals.damageTaken}
            <span className={styles.detail}>
              ✖ {totals.dodgedOrBlocked} / {totals.swingsReceived} ({share(totals.dodgedOrBlocked, totals.swingsReceived)}%)
            </span>
          </td>
          <td>
            {totals.healingDone}
            <span className={styles.detail}>⟳ {totals.heals}</span>
            <span className={styles.detail}>⦰ {average(totals.healingDone, totals.heals)}</span>
          </td>
          <td>{totals.healingReceived}</td>
          <td>{finalThreat[fighter.id]?.threat ?? 0}</td>
          <td>{share(fighterPoints, points)}%</td>
        </tr>
      );
    });
  };

  return (
    <div className={styles.tableScroll}>
      <table className={shared.statsTable}>
        <thead>
          <tr>
            <th rowSpan={2} />
            <th colSpan={2}>Damage</th>
            <th colSpan={2}>Healing</th>
            <th rowSpan={2}>Threat</th>
            <th rowSpan={2}>Points</th>
          </tr>
          <tr>
            <th>done</th>
            <th>get</th>
            <th>done</th>
            <th>get</th>
          </tr>
        </thead>
        <tbody>
          {renderTeam(log.attackers)}
          {renderTeam(log.defenders)}
        </tbody>
      </table>
    </div>
  );
}

/* ----- Round log ----- */

function LifePanel({ rows, side }: { readonly rows: LifeRow[]; readonly side: 'attacker' | 'defender' }) {
  return (
    <div className={styles.lifePanel}>
      {rows.map((row) => (
        <div key={row.id} className={styles.lifeRow}>
          <span className={styles.lifeLabel}>
            {row.label}
            {row.change !== 0 && (
              <span className={row.change < 0 ? styles.lifeLoss : styles.lifeGain}>
                {row.change > 0 ? `+${row.change}` : row.change}
              </span>
            )}
          </span>
          <div className={styles.bar}>
            <div
              className={side === 'attacker' ? styles.barFillAttacker : styles.barFillDefender}
              style={{ width: `${row.maxLife > 0 ? (row.life / row.maxLife) * 100 : 0}%` }}
            />
          </div>
          <span className={styles.lifeValue}>{row.life} / {row.maxLife}</span>
          <span className={styles.threat}>Threat {row.threatPercent}%</span>
        </div>
      ))}
    </div>
  );
}

/** The class for one result line: plain text, or the damage colours (grey when blocked); bold when emphasised. */
function resultLineClass(line: ResultLine, swing: SwingEvent): string {
  if (!line.isDamage) return line.emphasis ? styles.resultPlainBold : shared.resultMiss;
  if (swing.isBlocked) return line.emphasis ? shared.resultCritBlocked : shared.resultBlocked;
  return line.emphasis ? shared.resultCrit : shared.resultNormal;
}

function ActionRows({ action, names, isDefender }: { readonly action: TeamAction; readonly names: Map<string, string>; readonly isDefender: boolean }) {
  const actor = names.get(action.actorId);
  const rowClass = isDefender ? shared.strikeRowDefender : shared.strikeRow;

  // A cast replaces the enemy's attack: the game prints its line in bold across the row, then what it did
  if (action.type === 'cast') {
    return (
      <>
        <tr className={rowClass}>
          <td colSpan={2}><strong>{action.text}</strong></td>
        </tr>
        {action.hits.map((hit) => (
          <tr key={hit.targetId} className={rowClass}>
            <td>{actor} hits {names.get(hit.targetId)}.</td>
            <td className={shared.strikeRowResult}>
              <span className={shared.resultNormal}>{names.get(hit.targetId)} receives {hit.damage} damage</span>
            </td>
          </tr>
        ))}
        {action.healed > 0 && (
          <tr className={rowClass}>
            <td>{actor} heals {actor}.</td>
            <td className={shared.strikeRowResult}>
              <span className={styles.resultHeal}>{actor} receives {action.healed} healing</span>
            </td>
          </tr>
        )}
      </>
    );
  }

  const target = names.get(action.targetId) ?? '';
  // Damage over time: the game shows each tick as a line of its own
  if (action.type === 'tick') {
    return (
      <tr className={rowClass}>
        <td colSpan={2}>
          <span className={shared.resultNormal}>{target} receives {action.damage} damage</span>
        </td>
      </tr>
    );
  }
  if (action.type === 'heal') {
    const text = `${target} receives ${action.amount} healing`;
    return (
      <tr className={rowClass}>
        <td>{actor} heals {target}.</td>
        <td className={shared.strikeRowResult}>
          <span className={action.isCrit ? styles.resultCritHeal : styles.resultHeal}>{action.isCrit ? `*${text}*` : text}</span>
        </td>
      </tr>
    );
  }

  return (
    <>
      {action.swings.map((swing, index) => (
        <tr key={index} className={rowClass}>
          <td>{actor} hits {target}.</td>
          <td className={shared.strikeRowResult}>
            {swingLine(swing, target).map((line) => (
              <span key={line.text} className={`${styles.resultLine} ${resultLineClass(line, swing)}`}>
                {line.emphasis ? `*${line.text}*` : line.text}
              </span>
            ))}
          </td>
        </tr>
      ))}
    </>
  );
}

function RoundLog({ log }: { readonly log: TeamBattleLog }) {
  const [expanded, setExpanded] = useState(false);
  const everyone = [...log.attackers, ...log.defenders];
  const names = new Map(everyone.map((fighter) => [fighter.id, fighter.name]));
  const marks = teamMarks(log.attackers, log.defenders);
  const startOfFight: Record<string, FighterSnapshot> = Object.fromEntries(
    everyone.map((fighter) => [fighter.id, { life: fighter.maxLife, threat: 0 }]),
  );
  const rounds = expanded ? log.rounds : log.rounds.slice(0, ROUNDS_SHOWN_COLLAPSED);

  return (
    <>
      <table className={shared.logTable}>
        <tbody>
          {rounds.map((round) => {
            const previous = log.rounds[round.index - 1]?.endOfRound ?? startOfFight;
            return (
              <React.Fragment key={round.index}>
                <tr>
                  <th colSpan={2} className={shared.roundHeader}>Round {round.index + 1}</th>
                </tr>
                <tr>
                  <td colSpan={2}>
                    <div className={styles.lifePanels}>
                      <LifePanel side="attacker" rows={lifeRows(log.attackers, round.endOfRound, previous, marks.attacker)} />
                      <LifePanel side="defender" rows={lifeRows(log.defenders, round.endOfRound, previous, marks.defender)} />
                    </div>
                  </td>
                </tr>
                {round.actions.map((action, index) => (
                  <ActionRows key={index} action={action} names={names} isDefender={action.actorId.startsWith('defender')} />
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      {log.rounds.length > ROUNDS_SHOWN_COLLAPSED && (
        <button type="button" className={styles.toggle} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide details' : `Show details (all ${log.rounds.length} rounds)`}
        </button>
      )}
    </>
  );
}

/** A Circus Turma battle report, laid out like the game's: points, fighters, statistics, then round by round. */
type TeamTitles = { attackers: string; defenders: string };

/** `teamTitles` names the two sides' sections; by default each is "<leader>'s Turma". */
export default function TurmaBattleReport({ log, teamTitles }: {
  readonly log: TeamBattleLog;
  readonly teamTitles?: TeamTitles;
}): React.ReactElement {
  const header = headerText(log);
  const titles = teamTitles ?? { attackers: `${log.attackers[0]?.name}'s Turma`, defenders: `${log.defenders[0]?.name}'s Turma` };
  return (
    <div className={shared.report}>
      <div className={`${shared.headerBanner} ${header.className}`}>{header.text}</div>
      <p className={styles.points}>
        Attacker Points: {log.points.attacker}
        <br />
        Defender Points: {log.points.defender}
      </p>

      <div className={shared.sectionHeader}>{titles.attackers}</div>
      <TeamStatsTable team={log.attackers} opponents={log.defenders} />
      <div className={shared.sectionHeader}>{titles.defenders}</div>
      <TeamStatsTable team={log.defenders} opponents={log.attackers} />

      <div className={shared.sectionHeader}>Statistics</div>
      <StatisticsTable log={log} />

      <div className={shared.sectionHeader}>Battle Report</div>
      <RoundLog log={log} />
    </div>
  );
}
