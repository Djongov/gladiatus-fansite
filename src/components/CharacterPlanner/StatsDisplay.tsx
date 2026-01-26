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
    .filter(([_, values]) => values.flat !== 0 || values.percent !== 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className={styles.statsDisplay}>
      <h3 className={styles.title}>Character Stats</h3>
      
      <div className={styles.statsGrid}>
        {/* Primary Stats */}
        <div className={styles.statSection}>
          <h4 className={styles.sectionTitle}>Combat</h4>
          
          {stats.totalDamageMin > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statName}>Damage:</span>
              <span className={styles.statValue}>
                {stats.totalDamageMin} - {stats.totalDamageMax}
              </span>
            </div>
          )}
          
          <div className={styles.statRow}>
            <span className={styles.statName}>Armor:</span>
            <span className={styles.statValue}>{stats.totalArmor}</span>
          </div>
          
          {stats.totalHealth > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statName}>Health:</span>
              <span className={styles.statValue}>+{stats.totalHealth}</span>
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
