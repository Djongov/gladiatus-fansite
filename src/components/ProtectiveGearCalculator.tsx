import React, { useState } from 'react';
import ProtectiveGear from './ProtectiveGear';
import type { ItemRarity } from './Item';
import { RARITY_OPTIONS } from '@site/src/utils/rarity';
import styles from '@site/src/css/ConsumableCalculator.module.css';

type ProtectiveGearCalculatorProps = {
  defaultLevel?: number;
  defaultRarity?: ItemRarity;
};

export default function ProtectiveGearCalculator({
  defaultLevel = 112,
  defaultRarity = 'green',
}: ProtectiveGearCalculatorProps) {
  const [level, setLevel] = useState<number>(defaultLevel);
  const [rarity, setRarity] = useState<ItemRarity>(defaultRarity);

  const handleLevelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = Number.parseInt(event.target.value, 10);
    setLevel(Number.isFinite(parsed) ? parsed : 0);
  };

  const handleRarityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setRarity(event.target.value as ItemRarity);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <div className={styles.control}>
          <label htmlFor="protective-gear-calc-level">Level:</label>
          <input
            id="protective-gear-calc-level"
            type="number"
            min={1}
            max={200}
            value={level}
            onChange={handleLevelChange}
          />
        </div>
        <div className={styles.control}>
          <label htmlFor="protective-gear-calc-rarity">Rarity:</label>
          <select
            id="protective-gear-calc-rarity"
            value={rarity}
            onChange={handleRarityChange}
          >
            {RARITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.preview}>
        <ProtectiveGear level={level} rarity={rarity} />
      </div>
    </div>
  );
}
