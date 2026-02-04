import React from 'react';
import styles from './ForgingGood.module.css';
import forgingGoodsData from '@site/static/data/items/forging-goods.json';

export interface ForgingGood {
  name: string;
  type: 'material' | 'ore' | 'flask' | 'gemstone' | 'monster_part' | 'rune';
  image: string;
}

export type ForgingGoodRarity = 'common' | 'green' | 'blue' | 'purple' | 'orange' | 'red';

interface ForgingGoodProps {
  name: string;
  rarity?: ForgingGoodRarity;
}

const ForgingGoodComponent: React.FC<ForgingGoodProps> = ({ name, rarity = 'common' }) => {
  const forgingGood = (forgingGoodsData as ForgingGood[]).find(
    (item) => item.name === name
  );

  if (!forgingGood) {
    console.warn(`Forging good "${name}" not found in forging-goods.json`);
    return <span style={{ color: 'red' }}>Material not found: {name}</span>;
  }

  return (
    <div className={styles.wrapper}>
      <img
        src={forgingGood.image}
        alt={forgingGood.name}
        className={styles.icon}
      />
      <div className={styles.tooltip}>
        <div className={`${styles.title} ${styles[rarity]}`}>
          {forgingGood.name}
        </div>
      </div>
    </div>
  );
};

export default ForgingGoodComponent;
