import React, { useState } from 'react';
import Grindstone from './Grindstone';
import type { ItemRarity } from './Item';
import { RARITY_OPTIONS } from '@site/src/utils/rarity';
import styles from '@site/src/css/ConsumableCalculator.module.css';

type GrindstoneCalculatorProps = {
  defaultLevel?: number;
  defaultRarity?: ItemRarity;
};

export default function GrindstoneCalculator({
  defaultLevel = 97,
  defaultRarity = 'green',
}: GrindstoneCalculatorProps) {
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
          <label htmlFor="grindstone-calc-level">Level:</label>
          <input
            id="grindstone-calc-level"
            type="number"
            min={1}
            max={200}
            value={level}
            onChange={handleLevelChange}
          />
        </div>
        <div className={styles.control}>
          <label htmlFor="grindstone-calc-rarity">Rarity:</label>
          <select
            id="grindstone-calc-rarity"
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
        <Grindstone level={level} rarity={rarity} />
      </div>
    </div>
  );
}
