import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import ImportProfile from '@site/src/components/CharacterPlanner/ImportProfile';
import {
  decodeCharacterState,
  calculateCharacterStats,
  type BaseStats,
  type EquippedItem,
  type ItemSlotType,
  type CharacterIdentity,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import type { PactId } from '@site/src/components/CharacterPlanner/PactDefinitions';
import { characterToCombatant } from '@site/src/services/combat/characterToCombatant';
import { simulateOddsPvP, oddsToPercentages } from '@site/src/services/combat/simulateOdds';
import type { Combatant } from '@site/src/services/combat/types';
import AttackModal from '@site/src/components/AttackModal/AttackModal';
import CharacterPortrait from '@site/src/components/CharacterPortrait/CharacterPortrait';
import styles from '@site/src/css/ArenaSimulator.module.css';

function winColor(pct: number): string {
  const hue = pct * 1.2;
  return `hsl(${hue}, 65%, 42%)`;
}
function lossColor(pct: number): string {
  const hue = (100 - pct) * 1.2;
  return `hsl(${hue}, 65%, 42%)`;
}
function chanceToHit(attackerDex: number, defenderAgi: number): number {
  if (attackerDex + defenderAgi <= 0) return 0;
  return Math.floor((attackerDex / (attackerDex + defenderAgi)) * 100);
}

function CharacterPanel({
  combatant,
  opposingAgility,
}: {
  combatant: Combatant;
  opposingAgility: number | null;
}): React.ReactElement {
  return (
    <div className={styles.characterPanel}>
      <div className="player_name_bg">
        <div className="playername">{combatant.name}</div>
      </div>
      <CharacterPortrait
        costume={combatant.costume}
        level={combatant.level}
        gender={combatant.gender ?? 'male'}
      />

      <dl className={styles.statsList}>
        <div className={styles.statRow}><dt>Level</dt><dd>{combatant.level}</dd></div>
        <div className={styles.statRow}><dt>Life points</dt><dd>{combatant.maxHp.toLocaleString()}</dd></div>
        <div className={styles.statRow}><dt>Damage</dt><dd>{combatant.damageMin}-{combatant.damageMax}</dd></div>
        <div className={styles.statRow}>
          <dt>Armour</dt>
          <dd>{combatant.armour.toLocaleString()} ({combatant.armourAbsorbMin}-{combatant.armourAbsorbMax})</dd>
        </div>
        <div className={styles.statRow}>
          <dt>Hit chance</dt>
          <dd>{opposingAgility !== null ? `${chanceToHit(combatant.dexterity, opposingAgility)} %` : '—'}</dd>
        </div>
        <div className={styles.statRow}>
          <dt>Crit chance</dt>
          <dd>{Math.round(combatant.critChance)} %</dd>
        </div>
        <div className={styles.statRow}>
          <dt>Block chance</dt>
          <dd>{Math.round(combatant.blockChance)} %</dd>
        </div>
      </dl>
    </div>
  );
}

export default function ArenaSimulatorPage(): React.ReactElement {
  const { character } = useActiveCharacter();

  const attackerCombatant = useMemo<Combatant | null>(() => {
    if (!character) return null;
    try {
      const decoded = decodeCharacterState(character.encoded, character.identity.name);
      if (!decoded) return null;
      const stats = calculateCharacterStats(
        decoded.items,
        decoded.level,
        decoded.baseStats,
        decoded.pacts,
      );
      return characterToCombatant({
        identity: decoded.identity,
        level: decoded.level,
        stats,
      });
    } catch (err) {
      console.warn('[ArenaSimulator] attacker decode failed:', err);
      return null;
    }
  }, [character]);

  const [opponent, setOpponent] = useState<Combatant | null>(null);
  const [oddsResult, setOddsResult] = useState<{
    wins: number;
    losses: number;
    draws: number;
    ran: number;
  } | null>(null);
  const [sampleSize, setSampleSize] = useState<number>(500);
  const [showAttackModal, setShowAttackModal] = useState(false);

  const handleOpponentImport = (
    level: number,
    baseStats: BaseStats,
    items: Map<ItemSlotType, EquippedItem>,
    identity: CharacterIdentity,
    pacts?: Set<PactId>,
  ) => {
    try {
      const stats = calculateCharacterStats(items, level, baseStats, pacts ?? new Set());
      const combatant = characterToCombatant({ identity, level, stats });
      setOpponent(combatant);
      setOddsResult(null);
    } catch (err) {
      console.warn('[ArenaSimulator] opponent build failed:', err);
    }
  };

  const handleChangeOpponent = () => {
    setOpponent(null);
    setOddsResult(null);
  };

  const handleAttack = () => {
    if (attackerCombatant && opponent) setShowAttackModal(true);
  };

  const handleSimulateOdds = () => {
    if (!attackerCombatant || !opponent) return;
    const result = simulateOddsPvP(attackerCombatant, opponent, sampleSize);
    setOddsResult({
      wins: result.wins,
      losses: result.losses,
      draws: result.draws,
      ran: result.ran,
    });
  };

  if (!character) {
    return (
      <Layout title="Arena Simulator">
        <div className={styles.wrapper}>
          <h1>Arena Simulator</h1>
          <div className={styles.notice}>
            <p>
              <strong>Load a character first.</strong> The Arena Simulator needs
              your character's stats and gear to simulate fights.
            </p>
            <Link to="/character" className="awesome-button big">Load Character</Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!attackerCombatant) {
    return (
      <Layout title="Arena Simulator">
        <div className={styles.wrapper}>
          <h1>Arena Simulator</h1>
          <p className={styles.error}>
            Could not load your character data. Please re-import via{' '}
            <Link to="/character">/character</Link>.
          </p>
        </div>
      </Layout>
    );
  }

  const buttonsDisabled = !opponent;
  const disabledReason = !opponent ? 'Import an opponent first.' : '';

  const oddsPct = oddsResult && oddsResult.ran > 0 ? oddsToPercentages(oddsResult) : null;

  return (
    <Layout title="Arena Simulator">
      <div className={styles.wrapper}>
        <h1>Arena Simulator</h1>
        <div className={styles.layout}>

          <CharacterPanel
            combatant={attackerCombatant}
            opposingAgility={opponent ? opponent.agility : null}
          />

          <div className={styles.opponentColumn}>
            {!opponent ? (
              <>
                <h2 className={styles.opponentHeading}>Import Opponent</h2>
                <ImportProfile onImport={handleOpponentImport} />
              </>
            ) : (
              <>
                <CharacterPanel
                  combatant={opponent}
                  opposingAgility={attackerCombatant.agility}
                />
                <button
                  type="button"
                  className={styles.changeOpponent}
                  onClick={handleChangeOpponent}
                >
                  Change opponent
                </button>
                <div className={styles.buttonsRow}>
                  <div className={styles.buttonColumn}>
                    <button
                      className="awesome-button big"
                      onClick={handleAttack}
                      disabled={buttonsDisabled}
                      title={disabledReason || undefined}
                    >
                      Attack
                    </button>
                    <p className={styles.buttonDescription}>
                      Run one fight. Opens the round-by-round battle report.
                    </p>
                  </div>
                  <div className={styles.buttonColumn}>
                    <button
                      className="awesome-button big"
                      onClick={handleSimulateOdds}
                      disabled={buttonsDisabled}
                      title={disabledReason || undefined}
                    >
                      Simulate Odds
                    </button>
                    <p className={styles.buttonDescription}>
                      Run {sampleSize.toLocaleString()} fights against this opponent. Win/loss/draw odds shown below.
                    </p>
                    <div className={styles.sampleSizeRow}>
                      <label htmlFor="arena-sample-size-select">Sample size:</label>
                      <select
                        id="arena-sample-size-select"
                        value={sampleSize}
                        onChange={(e) => setSampleSize(Number(e.target.value))}
                        disabled={buttonsDisabled}
                      >
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                        <option value={1000}>1,000</option>
                        <option value={2000}>2,000</option>
                      </select>
                    </div>
                  </div>
                </div>

                {oddsPct && (
                  <div className={styles.oddsResult}>
                    <div className={styles.oddsTile}>
                      <div className={styles.oddsLabel}>Wins</div>
                      <div className={styles.oddsValue} style={{ color: winColor(oddsPct.wins) }}>
                        {oddsPct.wins}%
                      </div>
                    </div>
                    <div className={styles.oddsTile}>
                      <div className={styles.oddsLabel}>Losses</div>
                      <div className={styles.oddsValue} style={{ color: lossColor(oddsPct.losses) }}>
                        {oddsPct.losses}%
                      </div>
                    </div>
                    <div className={styles.oddsTile}>
                      <div className={styles.oddsLabel}>Draws</div>
                      <div className={styles.oddsValue} style={{ color: '#777' }}>
                        {oddsPct.draws}%
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showAttackModal && opponent && (
        <AttackModal
          mode="pvp"
          attacker={attackerCombatant}
          defender={opponent}
          onClose={() => setShowAttackModal(false)}
        />
      )}
    </Layout>
  );
}
