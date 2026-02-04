import React, { useMemo } from 'react';
import styles from './ForgingGoodInfo.module.css';
import forgingGoodsData from '@site/static/data/items/forging-goods.json';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';

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
  id?: number;
}

interface PrefixData {
  name: string;
  id: number;
  materials: { [key: string]: number };
}

interface SuffixData {
  name: string;
  id: number;
  materials: { [key: string]: number };
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

  // Dynamically compute prefixes that use this material
  const prefixes = useMemo(() => {
    const result: PrefixSuffix[] = [];
    (prefixesData as PrefixData[]).forEach((prefix) => {
      if (prefix.materials && prefix.materials[name]) {
        result.push({
          name: prefix.name,
          id: prefix.id,
          quantity: prefix.materials[name],
        });
      }
    });
    // Sort by quantity descending
    return result.sort((a, b) => b.quantity - a.quantity);
  }, [name]);

  // Dynamically compute suffixes that use this material
  const suffixes = useMemo(() => {
    const result: PrefixSuffix[] = [];
    (suffixesData as SuffixData[]).forEach((suffix) => {
      if (suffix.materials && suffix.materials[name]) {
        result.push({
          name: suffix.name,
          id: suffix.id,
          quantity: suffix.materials[name],
        });
      }
    });
    // Sort by quantity descending
    return result.sort((a, b) => b.quantity - a.quantity);
  }, [name]);

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

      {displayPrefixes && prefixes.length > 0 && (
        <div className={styles.section}>
          <h2>Prefixes with material</h2>
          <div className={styles.affixGrid}>
            {prefixes.map((prefix, index) => (
              <a
                key={index}
                href={`/items/prefix/${encodeURIComponent(prefix.name.toLowerCase())}`}
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

      {displaySuffixes && suffixes.length > 0 && (
        <div className={styles.section}>
          <h2>Suffixes with material</h2>
          <div className={styles.affixGrid}>
            {suffixes.map((suffix, index) => (
              <a
                key={index}
                href={`/items/suffix/${encodeURIComponent(suffix.name.toLowerCase())}`}
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
