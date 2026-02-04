import React from 'react';
import styles from './ForgingGoodInfo.module.css';
import forgingGoodsData from '@site/static/data/items/forging-goods.json';

interface Drop {
  percentage: number;
  mob: string;
  location: string;
}

interface PrefixSuffix {
  name: string;
  id: number;
  quantity: number;
}

interface ForgingGoodData {
  name: string;
  type: string;
  image: string;
  description?: string;
  scarcity?: string;
  drops?: Drop[];
  prefixes?: PrefixSuffix[];
  suffixes?: PrefixSuffix[];
}

interface ForgingGoodInfoProps {
  name: string;
  displayDescription?: boolean;
  displayScarcity?: boolean;
  displayDrops?: boolean;
  displayPrefixes?: boolean;
  displaySuffixes?: boolean;
}

const ForgingGoodInfo: React.FC<ForgingGoodInfoProps> = ({
  name,
  displayDescription = true,
  displayScarcity = true,
  displayDrops = true,
  displayPrefixes = true,
  displaySuffixes = true,
}) => {
  const material = (forgingGoodsData as ForgingGoodData[]).find(
    (item) => item.name === name
  );

  if (!material) {
    return <div className={styles.error}>Material "{name}" not found in database</div>;
  }

  return (
    <div className={styles.container}>
      {displayDescription && material.description && (
        <div className={styles.section}>
          <p className={styles.description}>{material.description}</p>
        </div>
      )}

      {displayDrops && material.drops && material.drops.length > 0 && (
        <div className={styles.section}>
          <h2>Drops From</h2>
          <ul className={styles.dropsList}>
            {material.drops.map((drop, index) => (
              <li key={index}>
                Drops <strong>{drop.percentage}%</strong> from{' '}
                <span className={styles.mobName}>{drop.mob}</span> in{' '}
                <span className={styles.location}>{drop.location}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {displayPrefixes && material.prefixes && material.prefixes.length > 0 && (
        <div className={styles.section}>
          <h2>Smelts From (Prefixes)</h2>
          <div className={styles.affixGrid}>
            {material.prefixes.map((prefix, index) => (
              <a
                key={index}
                href={`/items/prefix/${prefix.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className={styles.affixLink}
                title={`${prefix.name} (${prefix.quantity} materials)`}
              >
                <span className={styles.affixName}>{prefix.name}</span>
                <span className={styles.affixQuantity}>×{prefix.quantity}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {displaySuffixes && material.suffixes && material.suffixes.length > 0 && (
        <div className={styles.section}>
          <h2>Smelts From (Suffixes)</h2>
          <div className={styles.affixGrid}>
            {material.suffixes.map((suffix, index) => (
              <a
                key={index}
                href={`/items/suffix/${suffix.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className={styles.affixLink}
                title={`${suffix.name} (${suffix.quantity} materials)`}
              >
                <span className={styles.affixName}>{suffix.name}</span>
                <span className={styles.affixQuantity}>×{suffix.quantity}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {displayScarcity && material.scarcity && (
        <div className={styles.section}>
          <h2>Rarity</h2>
          <p className={styles.scarcity}>{material.scarcity}</p>
        </div>
      )}
    </div>
  );
};

export default ForgingGoodInfo;
