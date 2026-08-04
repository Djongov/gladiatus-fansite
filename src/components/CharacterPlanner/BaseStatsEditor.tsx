import React from 'react';
import styles from './BaseStatsEditor.module.css';
import { BaseStats, CharacterStats } from './useCharacterState';
import { PactId } from './PactDefinitions';
import { getTrainingCap } from '@site/src/utils/trainingCap';

interface BaseStatsEditorProps {
  baseStats: BaseStats;
  setBaseStats: (stats: Partial<BaseStats>) => void;
  characterStats: CharacterStats;
  characterLevel: number;
  activePacts: Set<PactId>;
}

// Map each stat to the pact that increases its effective cap
const STAT_PACT: Partial<Record<keyof BaseStats, PactId>> = {
  strength: 'honour_hero',
  dexterity: 'honour_armourer',
  agility: 'sk_assassins',
  constitution: 'sk_immortals',
  charisma: 'blessing_venus',
};

export default function BaseStatsEditor({ baseStats, setBaseStats, characterStats, characterLevel, activePacts }: BaseStatsEditorProps) {
  const handleStatChange = (stat: keyof BaseStats, value: string) => {
    const numValue = Number.parseInt(value, 10);
    const trainingCap = getTrainingCap(characterLevel);
    if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= trainingCap) {
      setBaseStats({ [stat]: numValue });
    }
  };

  // Calculate maximum effective stat (natural cap + pact bonus)
  const calculateMaxStat = (baseStat: number, statKey: keyof BaseStats): number => {
    const naturalMax = baseStat + Math.floor(baseStat / 2) + characterLevel;
    const pactId = STAT_PACT[statKey];
    const pactBonus = pactId && activePacts.has(pactId) ? Math.floor(baseStat / 2) : 0;
    return naturalMax + pactBonus;
  };

  // Calculate final effective stat including equipment bonuses and pact bonus
  const calculateFinalStat = (baseStat: number, statName: string, statKey: keyof BaseStats): number => {
    const equipBonus = characterStats.stats.get(statName);
    const percentBonus = equipBonus ? Math.floor(baseStat * (equipBonus.percent / 100)) : 0;
    const flatBonus = equipBonus?.flat ?? 0;
    const uncapped = baseStat + flatBonus + percentBonus;

    const naturalMax = baseStat + Math.floor(baseStat / 2) + characterLevel;
    const pactId = STAT_PACT[statKey];
    const pactBonus = pactId && activePacts.has(pactId) ? Math.floor(baseStat / 2) : 0;
    return Math.min(uncapped, naturalMax + pactBonus);
  };

  const statNames: Array<{ key: keyof BaseStats; display: string }> = [
    { key: 'strength', display: 'Strength' },
    { key: 'dexterity', display: 'Dexterity' },
    { key: 'agility', display: 'Agility' },
    { key: 'constitution', display: 'Constitution' },
    { key: 'charisma', display: 'Charisma' },
    { key: 'intelligence', display: 'Intelligence' },
  ];

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Character Stats</h3>
      
      <div className={styles.statsGrid}>
        {statNames.map(({ key, display }) => {
          const finalValue = calculateFinalStat(baseStats[key], display, key);
          const maxValue = calculateMaxStat(baseStats[key], key);
          const trainingCap = getTrainingCap(characterLevel);
          const equipBonus = characterStats.stats.get(display);
          const hasBonus = finalValue !== baseStats[key];
          
          // Calculate the actual value from percentage (applied to base stat only)
          let percentValue = 0;
          if (equipBonus && equipBonus.percent !== 0) {
            percentValue = Math.floor(baseStats[key] * (equipBonus.percent / 100));
          }
          
          // Calculate total bonus from items
          const totalFromItems = (equipBonus?.flat || 0) + percentValue;
          
          // Calculate progress percentage
          const progressPercent = Math.min((finalValue / maxValue) * 100, 100);
          
          return (
            <div key={key} className={styles.statRow}>
              <div className={styles.statMainRow}>
                <label className={styles.statLabel}>{display}</label>
                <input
                  type="number"
                  min="0"
                  max={trainingCap}
                  value={baseStats[key]}
                  onChange={(e) => handleStatChange(key, e.target.value)}
                  className={styles.statInput}
                />
                {hasBonus && (
                  <span className={styles.finalValue}>→ {finalValue}</span>
                )}
              </div>
              
              {/* Progress bar */}
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBar} 
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              
              <div className={styles.statBreakdown}>
                <div>Base: {baseStats[key]} | Training Cap: {trainingCap} | Max with items: {maxValue}</div>
                {equipBonus && (equipBonus.flat !== 0 || equipBonus.percent !== 0) && (
                  <div>
                    From items: 
                    {equipBonus.flat !== 0 && ` ${equipBonus.flat > 0 ? '+' : ''}${equipBonus.flat}`}
                    {equipBonus.percent !== 0 && ` ${equipBonus.percent > 0 ? '+' : ''}${equipBonus.percent}% (${percentValue > 0 ? '+' : ''}${percentValue})`}
                    {' = '}
                    <strong>{totalFromItems > 0 ? '+' : ''}{totalFromItems}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
