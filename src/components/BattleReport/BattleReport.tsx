import React from 'react';
import type { BattleLog, Combatant, StrikeEvent } from '@site/src/services/combat/types';
import { chanceToDoubleHit, chanceToHit } from '@site/src/services/combat/chanceFormulas';
import { damageDealtBySide, strikeTallyBySide } from '@site/src/services/combat/simulateBattle';
import FightStage from '@site/src/components/FightReplay/FightStage';
import styles from './BattleReport.module.css';

export type Rewards = { gold: number; experience: number; honour: number };

type Props = {
  log: BattleLog;
  rewards?: Rewards | null;
};

const GOLD_ICON_URL = 'https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif';

function headerClass(log: BattleLog): string {
  if (log.outcome === 'attacker_wins') return styles.headerWin;
  if (log.outcome === 'defender_wins') return styles.headerLoss;
  return styles.headerDraw;
}

function headerText(log: BattleLog): string {
  if (log.outcome === 'attacker_wins') return `Winner: ${log.attacker.name}`;
  if (log.outcome === 'defender_wins') return `Winner: ${log.defender.name}`;
  return 'Draw — fight ended after the round limit';
}

/* ----- Stats panel ----- */

type PanelProps = {
  self: Combatant;
  opponent: Combatant;
  mirrored?: boolean;
};

function StatsPanel({ self, opponent, mirrored = false }: PanelProps) {
  const hit = chanceToHit(self.dexterity, opponent.agility);
  const dbl = Math.round(chanceToDoubleHit(self.charisma, self.dexterity, opponent.intelligence, opponent.agility));

  const rowClass = `${styles.statRow}${mirrored ? ' ' + styles.statRowMirror : ''}`;

  // Match the live-game battle report: show this fighter's RAW crit chance
  // (their nominal stat). The opponent's avoid-crit appears in its own row,
  // and the engine applies the subtraction internally per strike.
  const rows: Array<{ label: string; value: React.ReactNode; big?: boolean }> = [
    { label: 'Level', value: self.level, big: true },
    { label: 'Life points', value: `${self.hp} / ${self.maxHp}` },
    { label: 'Strength', value: self.strength },
    { label: 'Dexterity', value: self.dexterity },
    { label: 'Agility', value: self.agility },
    { label: 'Constitution', value: self.constitution },
    { label: 'Charisma', value: self.charisma },
    { label: 'Intelligence', value: self.intelligence },
    { label: 'Armour', value: `${self.armour} (${self.armourAbsorbMin} - ${self.armourAbsorbMax})` },
    { label: 'Damage', value: `${self.damageMin} - ${self.damageMax}`, big: true },
    { label: 'Hit chance', value: `${hit} %`, big: true },
    { label: 'Double hit', value: `${dbl} %`, big: true },
    { label: 'Chance for critical damage', value: `${Math.round(self.critChance)} %`, big: true },
    { label: 'Chance to block a hit', value: `${Math.round(self.blockChance)} %`, big: true },
    { label: 'Chance of avoiding critical hits', value: `${Math.round(self.critAvoidChance)} %`, big: true },
  ];

  return (
    <div className={`${styles.statsPanel}${mirrored ? ' ' + styles.statsPanelMirror : ''}`}>
      {rows.map((r, i) => (
        <div key={i} className={rowClass}>
          <span className={styles.statLabel}>{r.label}</span>
          <span className={r.big ? styles.statValueBig : styles.statValue}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ----- Damage statistics ----- */

function DamageStats({ log }: { log: BattleLog }) {
  // By side, not name: a fight against yourself has the same name on both sides
  const { attacker: attackerDealt, defender: defenderDealt } = damageDealtBySide(log.rounds);
  const attackerHpAfter = Math.max(0, log.attacker.maxHp - defenderDealt);
  const defenderHpAfter = Math.max(0, log.defender.maxHp - attackerDealt);

  return (
    <table className={styles.statsTable}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Hit points dealt</th>
          <th>Life points remaining</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>{log.attacker.name}</td>
          <td>{attackerDealt}</td>
          <td>{attackerHpAfter}</td>
        </tr>
        <tr>
          <td>{log.defender.name}</td>
          <td>{defenderDealt}</td>
          <td>{defenderHpAfter}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** A count with its share of the fighter's attacks, e.g. "12 (30%)". */
function countWithShare(count: number, attacks: number): string {
  return attacks > 0 ? `${count} (${Math.round((count / attacks) * 100)}%)` : '0';
}

function StrikeSummary({ log }: { log: BattleLog }) {
  const tally = strikeTallyBySide(log.rounds);
  const rows = [
    { side: 'attacker', name: log.attacker.name, ...tally.attacker },
    { side: 'defender', name: log.defender.name, ...tally.defender },
  ];

  return (
    <table className={styles.statsTable}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Attacks</th>
          <th>Critical hits</th>
          <th>Misses</th>
          <th>Blocked by opponent</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.side}>
            <td>{row.name}</td>
            <td>{row.attacks}</td>
            <td>{countWithShare(row.criticalHits, row.attacks)}</td>
            <td>{countWithShare(row.misses, row.attacks)}</td>
            <td>{countWithShare(row.blockedByOpponent, row.attacks)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ----- Battle log ----- */

function strikeResult(strike: StrikeEvent): React.ReactElement {
  if (strike.result === 'miss') {
    return <span className={styles.resultMiss}>missed</span>;
  }
  const isFatal = strike.defenderHpAfter <= 0;
  const damageText = strike.finalDamage > 0
    ? `${strike.defender} receives ${strike.finalDamage} damage`
    : 'blocked';

  let cls = styles.resultNormal;
  if (strike.isCrit && strike.isBlocked) cls = styles.resultCritBlocked;
  else if (strike.isCrit) cls = styles.resultCrit;
  else if (strike.isBlocked) cls = styles.resultBlocked;

  return (
    <>
      <span className={cls}>
        {strike.isCrit && strike.finalDamage > 0 ? <>*{damageText}*</> : damageText}
      </span>
      {isFatal && strike.finalDamage > 0 && (
        <span className={styles.deathLine}>
          <strong>*{strike.defender} dies*</strong>
        </span>
      )}
    </>
  );
}

function BattleLogTable({ log }: { log: BattleLog }) {
  return (
    <table className={styles.logTable}>
      <tbody>
        {log.rounds.map((round) => (
          <React.Fragment key={round.roundIndex}>
            <tr>
              <th colSpan={2} className={styles.roundHeader}>
                Round {round.roundIndex + 1}
              </th>
            </tr>
            {round.strikes.map((strike, idx) => {
              const isDefenderStriking = strike.attackerSide === 'defender';
              return (
                <tr
                  key={idx}
                  className={isDefenderStriking ? styles.strikeRowDefender : styles.strikeRow}
                >
                  <td>{strike.attacker} hits {strike.defender}.</td>
                  <td className={styles.strikeRowResult}>{strikeResult(strike)}</td>
                </tr>
              );
            })}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}

/* ----- Reward section ----- */

function RewardSection({ playerName, rewards }: { playerName: string; rewards: Rewards }) {
  return (
    <div className={styles.reward}>
      <div className={styles.sectionHeader}>Reward</div>
      <div className={styles.rewardBody}>
        <p className={styles.rewardLine}>
          <strong>{playerName}</strong> has raided:{' '}
          {rewards.gold.toLocaleString()}{' '}
          <img src={GOLD_ICON_URL} alt="Gold" className={styles.goldIcon} />
        </p>
        <p className={styles.rewardLine}>
          <strong>{playerName}</strong> received {rewards.experience} experience point(s)
        </p>
        <p className={styles.rewardLine}>
          <strong>{playerName}</strong> has received {rewards.honour} honour
        </p>
      </div>
    </div>
  );
}

/* ----- Main component ----- */

export default function BattleReport({ log, rewards }: Props): React.ReactElement {
  return (
    <div className={styles.report}>
      <div className={`${styles.headerBanner} ${headerClass(log)}`}>{headerText(log)}</div>

      {rewards && <RewardSection playerName={log.attacker.name} rewards={rewards} />}

      <FightStage log={log} />

      <div className={styles.statsRow}>
        <StatsPanel self={log.attacker} opponent={log.defender} />
        <StatsPanel self={log.defender} opponent={log.attacker} mirrored />
      </div>

      <div className={styles.sectionHeader}>Statistics</div>
      <DamageStats log={log} />
      <StrikeSummary log={log} />

      <div className={styles.sectionHeader}>Battle Report</div>
      <BattleLogTable log={log} />
    </div>
  );
}
