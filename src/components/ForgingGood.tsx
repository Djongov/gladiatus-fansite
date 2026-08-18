import React from 'react';
import styles from './ForgingGood.module.css';
import forgingGoodsData from '@site/static/data/items/forging-goods.json';

export interface ForgingGoodDrop {
  percentage: number;
  mob: string;
  location: string;
}

// Full shape of an entry in forging-goods.json. Only the fields present on
// every entry are required; the rest stay optional so the cast never breaks.
export interface ForgingGood {
  name: string;
  type: 'material' | 'ore' | 'flask' | 'gemstone' | 'monster_part' | 'rune';
  spriteId: string;
  id?: number;
  description?: string;
  scarcity?: string;
  drops?: ForgingGoodDrop[];
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
      <div className={`item-i-${forgingGood.spriteId} ${styles.icon}`} />
      <div className={styles.tooltip}>
        <div className={`${styles.title} ${styles[rarity]}`}>
          {forgingGood.name}
        </div>
      </div>
    </div>
  );
};

export default ForgingGoodComponent;
