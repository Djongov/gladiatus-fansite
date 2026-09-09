import React, { useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import {
  decodeCharacterState,
  calculateCharacterStats,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import { characterToCombatant } from '@site/src/services/combat/characterToCombatant';
import { simulateOdds, oddsToPercentages } from '@site/src/services/combat/simulateOdds';
import type { Combatant } from '@site/src/services/combat/types';
import type {
  Enemy,
  ExpeditionsData,
  Country,
  Expedition as ExpeditionData,
} from '@site/src/types/expeditions';
import expeditionsData from '@site/static/data/expeditions.json';
import AttackModal from '@site/src/components/AttackModal/AttackModal';
import CharacterPortrait from '@site/src/components/CharacterPortrait/CharacterPortrait';
import {
  ExpeditionBonusesCell,
  type BonusId,
} from '@site/src/components/ExpeditionBonuses/ExpeditionBonuses';
import styles from '@site/src/css/ExpeditionSimulator.module.css';

const data = expeditionsData as ExpeditionsData;
type CountryKey = keyof ExpeditionsData;
const COUNTRY_KEYS: CountryKey[] = ['italy', 'africa', 'germania', 'britannia'];

function winColor(pct: number): string {
  // 0 → red (hue 0), 100 → green (hue 120)
  const hue = pct * 1.2;
  return `hsl(${hue}, 65%, 42%)`;
}

function lossColor(pct: number): string {
  // 0% loss → green, 100% loss → red (inverted)
  const hue = (100 - pct) * 1.2;
  return `hsl(${hue}, 65%, 42%)`;
}

function chanceToHit(attackerDex: number, defenderAgi: number): number {
  if (attackerDex + defenderAgi <= 0) return 0;
  return Math.floor((attackerDex / (attackerDex + defenderAgi)) * 100);
}

export default function ExpeditionSimulatorPage(): React.ReactElement {
  const { character } = useActiveCharacter();

  const playerCombatant = useMemo<Combatant | null>(() => {
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
      console.warn('[ExpeditionSimulator] decode failed:', err);
      return null;
    }
  }, [character]);

  const [country, setCountry] = useState<CountryKey | ''>('');
  const [expeditionSlug, setExpeditionSlug] = useState<string>('');
  const [enemyIndex, setEnemyIndex] = useState<number>(-1);
  const [bonusesByPath, setBonusesByPath] = useState<Record<string, Set<BonusId>>>({});
  const [oddsResult, setOddsResult] = useState<{
    wins: number;
    losses: number;
    draws: number;
    ran: number;
  } | null>(null);
  const [sampleSize, setSampleSize] = useState<number>(500);
  const [attackEnemy, setAttackEnemy] = useState<Enemy | null>(null);

  const currentCountry: Country | null = country ? data[country] : null;
  const currentExpedition: ExpeditionData | null = currentCountry
    ? currentCountry.expeditions.find((e) => e.slug === expeditionSlug) ?? null
    : null;
  const currentEnemy: Enemy | null = currentExpedition && enemyIndex >= 0 && enemyIndex <= 3
    ? currentExpedition.enemies[enemyIndex]
    : null;

  const bonusPathKey = currentEnemy ? `${country}/${expeditionSlug}/${enemyIndex}` : '';
  const activeBonuses = bonusesByPath[bonusPathKey] ?? new Set<BonusId>();

  const toggleBonus = (bonusId: BonusId) => {
    if (!bonusPathKey) return;
    setBonusesByPath((prev) => {
      const next = new Set(prev[bonusPathKey] ?? new Set<BonusId>());
      if (next.has(bonusId)) next.delete(bonusId);
      else next.add(bonusId);
      return { ...prev, [bonusPathKey]: next };
    });
  };

  const onCountryChange = (value: string) => {
    setCountry(value as CountryKey | '');
    setExpeditionSlug('');
    setEnemyIndex(-1);
    setOddsResult(null);
  };
  const onExpeditionChange = (slug: string) => {
    setExpeditionSlug(slug);
    setEnemyIndex(-1);
    setOddsResult(null);
  };
  const onEnemyChange = (value: string) => {
    setEnemyIndex(value === '' ? -1 : Number(value));
    setOddsResult(null);
  };

  const handleAttack = () => {
    if (currentEnemy && currentEnemy.life !== null) setAttackEnemy(currentEnemy);
  };
  const handleSimulateOdds = () => {
    if (!playerCombatant || !currentEnemy || currentEnemy.life === null) return;
    const result = simulateOdds(playerCombatant, currentEnemy, sampleSize);
    setOddsResult({
      wins: result.wins,
      losses: result.losses,
      draws: result.draws,
      ran: result.ran,
    });
  };

  if (!character) {
    return (
      <Layout title="Expedition Simulator">
        <div className={styles.wrapper}>
          <h1>Expedition Simulator</h1>
          <div className={styles.notice}>
            <p>
              <strong>Load a character first.</strong> The Expedition Simulator needs
              your character's stats and gear to simulate fights.
            </p>
            <Link to="/character" className="awesome-button big">Load Character</Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (!playerCombatant) {
    return (
      <Layout title="Expedition Simulator">
        <div className={styles.wrapper}>
          <h1>Expedition Simulator</h1>
          <p className={styles.error}>
            Could not load your character data. Please re-import via{' '}
            <Link to="/character">/character</Link>.
          </p>
        </div>
      </Layout>
    );
  }

  const buttonsDisabled = !currentEnemy || currentEnemy.life === null;
  const disabledReason = !currentEnemy
    ? 'Pick a country, expedition, and enemy first.'
    : currentEnemy.life === null
      ? 'No combat data available for this enemy yet.'
      : '';

  const oddsPct = oddsResult && oddsResult.ran > 0 ? oddsToPercentages(oddsResult) : null;

  return (
    <Layout title="Expedition Simulator">
      <div className={styles.wrapper}>
        <h1>Expedition Simulator</h1>
        <div className={styles.layout}>

          <div className={styles.playerPanel}>
            <div className="player_name_bg">
              <div className="playername">{playerCombatant.name}</div>
            </div>
            <CharacterPortrait
              costume={playerCombatant.costume}
              level={playerCombatant.level}
              gender={playerCombatant.gender ?? 'male'}
            />

            <dl className={styles.statsList}>
              <div className={styles.statRow}><dt>Level</dt><dd>{playerCombatant.level}</dd></div>
              <div className={styles.statRow}><dt>Life points</dt><dd>{playerCombatant.maxHp.toLocaleString()}</dd></div>
              <div className={styles.statRow}><dt>Damage</dt><dd>{playerCombatant.damageMin}-{playerCombatant.damageMax}</dd></div>
              <div className={styles.statRow}>
                <dt>Armour</dt>
                <dd>{playerCombatant.armour.toLocaleString()} ({playerCombatant.armourAbsorbMin}-{playerCombatant.armourAbsorbMax})</dd>
              </div>
              <div className={styles.statRow}>
                <dt>Hit chance</dt>
                <dd>{currentEnemy ? `${chanceToHit(playerCombatant.dexterity, currentEnemy.agility.max)} %` : '—'}</dd>
              </div>
              <div className={styles.statRow}>
                <dt>Crit chance</dt>
                <dd>{Math.round(playerCombatant.critChance)} %</dd>
              </div>
              <div className={styles.statRow}>
                <dt>Block chance</dt>
                <dd>{Math.round(playerCombatant.blockChance)} %</dd>
              </div>
            </dl>
          </div>

          <div className={styles.controlsPanel}>

            <div className={styles.dropdownRow}>
              <label htmlFor="country-select">Country:</label>
              <select
                id="country-select"
                value={country}
                onChange={(e) => onCountryChange(e.target.value)}
              >
                <option value="">— Select country —</option>
                {COUNTRY_KEYS.map((k) => (
                  <option key={k} value={k}>{data[k].name}</option>
                ))}
              </select>
            </div>

            <div className={styles.dropdownRow}>
              <label htmlFor="expedition-select">Expedition:</label>
              <select
                id="expedition-select"
                value={expeditionSlug}
                onChange={(e) => onExpeditionChange(e.target.value)}
                disabled={!currentCountry}
              >
                <option value="">— Select expedition —</option>
                {currentCountry?.expeditions.map((exp) => (
                  <option key={exp.slug} value={exp.slug}>{exp.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.dropdownRow}>
              <label htmlFor="enemy-select">Enemy:</label>
              <select
                id="enemy-select"
                value={enemyIndex >= 0 ? String(enemyIndex) : ''}
                onChange={(e) => onEnemyChange(e.target.value)}
                disabled={!currentExpedition}
              >
                <option value="">— Select enemy —</option>
                {currentExpedition?.enemies.map((en, i) => (
                  <option key={i} value={i}>
                    {en.name}{en.isBoss ? ' (Boss)' : ''}
                    {' — Level '}
                    {en.level.min === en.level.max ? en.level.min : `${en.level.min}-${en.level.max}`}
                  </option>
                ))}
              </select>
            </div>

            {currentEnemy && (
              <div className={styles.bonusesRow}>
                <span className={styles.bonusesLabel}>Bonuses:</span>
                <ExpeditionBonusesCell
                  enemyIndex={0}
                  activeBonuses={activeBonuses}
                  onToggleBonus={(_idx, bonusId) => toggleBonus(bonusId)}
                />
              </div>
            )}

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
                  Run {sampleSize.toLocaleString()} fights against this enemy. Win/loss/draw odds shown below.
                </p>
                <div className={styles.sampleSizeRow}>
                  <label htmlFor="sample-size-select">Sample size:</label>
                  <select
                    id="sample-size-select"
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

          </div>
        </div>
      </div>

      {attackEnemy && (
        <AttackModal
          mode="pve"
          enemy={attackEnemy}
          character={character}
          bonuses={new Set(activeBonuses)}
          onClose={() => setAttackEnemy(null)}
        />
      )}
    </Layout>
  );
}
