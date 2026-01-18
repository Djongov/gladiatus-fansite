import React from 'react';
import styles from '@site/src/css/ItemTooltip.module.css';

type Props = {
  name: string;
  rarity: 'common' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
  image: string;
  level?: number;
  damage?: string;
  stats?: string[];
  enchantValue?: number;
  gold?: string;
};

export default function CustomItemTooltip({
  name,
  rarity,
  image,
  level,
  damage,
  stats = [],
  enchantValue,
  gold,
}: Props) {
  return (
    <span className={styles.wrapper}>
      <img src={image} className={styles.icon} alt={name} />

      <span className={styles.tooltip}>
        <div className={`${styles.title} ${styles[rarity]}`}>
          {name}
        </div>

        {damage && <div>Damage {damage}</div>}

        {stats && stats.map((stat, i) => (
          <div key={i}>{stat}</div>
        ))}

        {enchantValue && <div className={styles.enchant}>+{enchantValue} Damage</div>}

        {level && <div className={styles.level}>Level {level}</div>}
        {gold && <div className={styles.gold}>Value {gold} <img src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif" alt="Gold" /></div>}
      </span>
    </span>
  );
}
