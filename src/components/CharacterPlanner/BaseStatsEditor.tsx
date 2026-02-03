import React from 'react';
import styles from './BaseStatsEditor.module.css';
import { BaseStats, CharacterStats } from './useCharacterState';

interface BaseStatsEditorProps {
  baseStats: BaseStats;
  setBaseStats: (stats: Partial<BaseStats>) => void;
  characterStats: CharacterStats;
  characterLevel: number;
}

export default function BaseStatsEditor({ baseStats, setBaseStats, characterStats, characterLevel }: BaseStatsEditorProps) {
  const handleStatChange = (stat: keyof BaseStats, value: string) => {
    const numValue = Number.parseInt(value, 10);
    if (!Number.isNaN(numValue) && numValue >= 0 && numValue <= 9999) {
      setBaseStats({ [stat]: numValue });
    }
  };

  // Calculate final stats including bonuses from equipment
  const calculateFinalStat = (baseStat: number, statName: string): number => {
    const equipBonus = characterStats.stats.get(statName);
    if (!equipBonus) return baseStat;
    
    // Apply percentage to base stat only, then add flat bonus
    const percentBonus = Math.round(baseStat * (equipBonus.percent / 100));
    const uncappedStat = baseStat + equipBonus.flat + percentBonus;
    
    // Cap at maximum stat value
    const maxStat = calculateMaxStat(baseStat);
    return Math.min(uncappedStat, maxStat);
  };

  // Calculate maximum stat: Basic + (Basic/2) + Character Level
  const calculateMaxStat = (baseStat: number): number => {
    return baseStat + Math.floor(baseStat / 2) + characterLevel;
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
          const finalValue = calculateFinalStat(baseStats[key], display);
          const maxValue = calculateMaxStat(baseStats[key]);
          const equipBonus = characterStats.stats.get(display);
          const hasBonus = finalValue !== baseStats[key];
          
          // Calculate the actual value from percentage (applied to base stat only)
          let percentValue = 0;
          if (equipBonus && equipBonus.percent !== 0) {
            percentValue = Math.round(baseStats[key] * (equipBonus.percent / 100));
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
                  max="9999"
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
                <div>Base: {baseStats[key]} | Max: {maxValue}</div>
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

      <div className={styles.derivedStats}>
        <div className={styles.derivedStat}>
          <span className={styles.derivedLabel}>Life Points:</span>
          <div className={styles.damageContainer}>
            <span className={styles.derivedValue}>{characterStats.totalHealth}</span>
            <div className={styles.damageBreakdown}>
              <div>Level: {characterStats.healthFromLevel}</div>
              <div>Constitution: {characterStats.healthFromConstitution > 0 ? '+' : ''}{characterStats.healthFromConstitution}</div>
              {characterStats.healthFromItems !== 0 && (
                <div>Items: {characterStats.healthFromItems > 0 ? '+' : ''}{characterStats.healthFromItems}</div>
              )}
              <div style={{ marginTop: '4px', borderTop: '1px solid #8b7355', paddingTop: '4px' }}>
                Regen/hour: {characterStats.healthRegenPerHour}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.derivedStat}>
          <span className={styles.derivedLabel}>Total Armour:</span>
          <span className={styles.derivedValue}>{characterStats.totalArmor}</span>
        </div>
        <div className={styles.derivedStat}>
          <span className={styles.derivedLabel}>Total Damage:</span>
          <div className={styles.damageContainer}>
            <span className={styles.derivedValue}>
              {characterStats.totalDamageMin} - {characterStats.totalDamageMax}
            </span>
            <div className={styles.damageBreakdown}>
              <div>Weapon: {characterStats.damageFromWeapons.min}-{characterStats.damageFromWeapons.max}</div>
              <div>Strength: +{characterStats.damageFromStrength}</div>
              {characterStats.damageFromItems !== 0 && (
                <div>Items: {characterStats.damageFromItems > 0 ? '+' : ''}{characterStats.damageFromItems}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
