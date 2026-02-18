import React from 'react';
import styles from './StatsDisplay.module.css';
import { CharacterStats } from './useCharacterState';

interface StatsDisplayProps {
  stats: CharacterStats;
}

/**
 * Displays total character statistics from all equipped items
 */
export default function StatsDisplay({ stats }: StatsDisplayProps) {
  // Convert stats map to sorted array for display
  const sortedStats = Array.from(stats.stats.entries())
    .filter(([statName, values]) => 
      (values.flat !== 0 || values.percent !== 0) && 
      statName !== 'Threat' && // Threat is now shown in Combat Stats
      statName !== 'Critical Attack Value' // Critical Attack Value is now shown in Combat Stats
    )
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={styles.statsDisplay}>
      
      <div className={styles.statsGrid}>
        {/* Primary Stats */}
        <div className={styles.statSection}>
          <h4 className={styles.sectionTitle}>Combat Stats</h4>
          
          {stats.totalDamageMin > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statName}>Damage:</span>
              <span className={styles.statValue}>
                {stats.totalDamageMin} - {stats.totalDamageMax}
                <div className={styles.statBreakdown}>
                  (Weapon: {stats.damageFromWeapons.min}-{stats.damageFromWeapons.max} + Strength: +{stats.damageFromStrength}{stats.damageFromItems !== 0 ? ` + Items: ${stats.damageFromItems > 0 ? '+' : ''}${stats.damageFromItems}` : ''})
                </div>
              </span>
            </div>
          )}
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Critical attack value:</span>
            <span className={styles.statValue}>
              {stats.totalCriticalAttack} / {stats.maxCriticalAttack}
              <div className={styles.statBreakdown}>
                (Dexterity: {stats.criticalAttackFromDexterity} + Items: {stats.criticalAttackFromItems})
              </div>
            </span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Chance for critical hit:</span>
            <span className={styles.statValue}>{Math.ceil(stats.criticalHitChance)}%</span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Chance to hit:</span>
            <span className={styles.statValue}>
              {stats.chanceToHit}%
              <div className={styles.statBreakdown}>
                * Enemy agility simulated as your max agility
              </div>
            </span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Chance to double hit:</span>
            <span className={styles.statValue}>
              {stats.chanceToDoubleHit.toFixed(2)}%
              <div className={styles.statBreakdown}>
                * Enemy intelligence and agility simulated as your max stats
              </div>
            </span>
          </div>
          
          <div className={styles.statRow}>
            <span className={styles.statName}>Armour:</span>
            <span className={styles.statValue}>{stats.totalArmor}</span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Absorbs Damage:</span>
            <span className={styles.statValue}>
              {stats.minDamageAbsorbed} - {stats.maxDamageAbsorbed}
            </span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Resilience (hardening value):</span>
            <span className={styles.statValue}>
              {stats.totalResilience} / {stats.maxResilience}
              <div className={styles.statBreakdown}>
                (Agility: {stats.resilienceFromAgility} + Items: {stats.resilienceFromItems})
              </div>
            </span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Chance to avoid critical hits:</span>
            <span className={styles.statValue}>{Math.ceil(stats.critAvoidanceChance)}%</span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Blocking (block value):</span>
            <span className={styles.statValue}>
              {stats.totalBlocking} / {stats.maxBlocking}
              <div className={styles.statBreakdown}>
                (Strength: {stats.blockingFromStrength} + Items: {stats.blockingFromItems})
              </div>
            </span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Chance to block a hit:</span>
            <span className={styles.statValue}>{Math.ceil(stats.blockChance)}%</span>
          </div>
          
          <div className={styles.statRowNested}>
            <span className={styles.statName}>Threat:</span>
            <span className={styles.statValue}>
              {stats.totalThreat}
              <div className={styles.statBreakdown}>
                (Charisma: {stats.threatFromCharisma} + Items: {stats.threatFromItems})
              </div>
            </span>
          </div>
          
          {stats.totalHealth > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statName}>Life Points:</span>
              <span className={styles.statValue}>
                {stats.totalHealth}
                <div className={styles.statBreakdown}>
                  (Level: {stats.healthFromLevel} + Constitution: {stats.healthFromConstitution > 0 ? '+' : ''}{stats.healthFromConstitution}{stats.healthFromItems !== 0 ? ` + Items: ${stats.healthFromItems > 0 ? '+' : ''}${stats.healthFromItems}` : ''})
                </div>
                <div className={styles.statBreakdown}>
                  Regen/hour: {stats.healthRegenPerHour}
                </div>
              </span>
            </div>
          )}
        </div>

        {/* Attribute Stats */}
        {sortedStats.length > 0 && (
          <div className={styles.statSection}>
            <h4 className={styles.sectionTitle}>Attributes</h4>
            {sortedStats.map(([statName, values]) => (
              <div key={statName} className={styles.statRow}>
                <span className={styles.statName}>
                  {statName.charAt(0).toUpperCase() + statName.slice(1)}:
                </span>
                <span className={styles.statValue}>
                  {values.flat > 0 && `+${values.flat}`}
                  {values.flat > 0 && values.percent > 0 && ' '}
                  {values.percent > 0 && `+${values.percent}%`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {stats.totalArmor === 0 && stats.totalDamageMin === 0 && sortedStats.length === 0 && (
        <div className={styles.emptyState}>
          <p>No items equipped</p>
          <p className={styles.emptyHint}>Click on the equipment slots to add items</p>
        </div>
      )}
    </div>
  );
}
