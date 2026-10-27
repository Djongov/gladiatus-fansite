import React, { useId, useState } from 'react';
import { oddsToPercentages, type OddsResult } from '@site/src/services/combat/simulateOdds';
import styles from './FightControls.module.css';

const SAMPLE_SIZES = [100, 500, 1000, 2000];
const DEFAULT_SAMPLE_SIZE = 500;

/** Green at 100%, red at 0% */
function winColor(pct: number): string {
  return `hsl(${pct * 1.2}, 65%, 42%)`;
}
function lossColor(pct: number): string {
  return `hsl(${(100 - pct) * 1.2}, 65%, 42%)`;
}

type FightControlsProps = {
  /** Who the fights are against, e.g. "this opponent" */
  readonly subject: string;
  readonly onAttack: () => void;
  /** Runs `sampleSize` fights and returns their results */
  readonly onSimulate: (sampleSize: number) => OddsResult;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  /** Shown under the odds once they're in */
  readonly note?: React.ReactNode;
};

/** The simulators' Attack / Simulate Odds buttons and the win/loss/draw tiles. */
export default function FightControls({ subject, onAttack, onSimulate, disabled = false, disabledReason, note }: FightControlsProps) {
  const [sampleSize, setSampleSize] = useState(DEFAULT_SAMPLE_SIZE);
  const [odds, setOdds] = useState<OddsResult | null>(null);
  const sampleSizeId = useId();
  const percentages = odds && odds.ran > 0 ? oddsToPercentages(odds) : null;

  return (
    <>
      <div className={styles.buttonsRow}>
        <div className={styles.buttonColumn}>
          <button className="awesome-button big" onClick={onAttack} disabled={disabled} title={disabledReason}>
            Attack
          </button>
          <p className={styles.buttonDescription}>Run one fight. Opens the round-by-round battle report.</p>
        </div>
        <div className={styles.buttonColumn}>
          <button
            className="awesome-button big"
            onClick={() => setOdds(onSimulate(sampleSize))}
            disabled={disabled}
            title={disabledReason}
          >
            Simulate Odds
          </button>
          <p className={styles.buttonDescription}>
            Run {sampleSize.toLocaleString()} fights against {subject}. Win/loss/draw odds shown below.
          </p>
          <div className={styles.sampleSizeRow}>
            <label htmlFor={sampleSizeId}>Sample size:</label>
            <select
              id={sampleSizeId}
              value={sampleSize}
              onChange={(event) => setSampleSize(Number(event.target.value))}
              disabled={disabled}
            >
              {SAMPLE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size.toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {percentages && (
        <>
          <div className={styles.oddsResult}>
            <div className={styles.oddsTile}>
              <div className={styles.oddsLabel}>Wins</div>
              <div className={styles.oddsValue} style={{ color: winColor(percentages.wins) }}>
                {percentages.wins}%
              </div>
            </div>
            <div className={styles.oddsTile}>
              <div className={styles.oddsLabel}>Losses</div>
              <div className={styles.oddsValue} style={{ color: lossColor(percentages.losses) }}>
                {percentages.losses}%
              </div>
            </div>
            <div className={styles.oddsTile}>
              <div className={styles.oddsLabel}>Draws</div>
              <div className={styles.oddsValue} style={{ color: '#777' }}>
                {percentages.draws}%
              </div>
            </div>
          </div>
          {note && <p className={styles.note}>{note}</p>}
        </>
      )}
    </>
  );
}
