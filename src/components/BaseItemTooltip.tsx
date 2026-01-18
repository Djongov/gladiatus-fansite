import React from 'react';
import styles from '@site/src/css/ItemTooltip.module.css';

export interface BaseItem {
  name: string;
  type: 'weapons' | 'shields' | 'armor' | 'helmets' | 'gloves' | 'shoes' | 'rings' | 'amulets';
  level: number | null;
  damageMin?: number;
  damageMax?: number;
  armor?: number | null;
  durability: number | null;
  conditioning: number | null;
  gold: number | null;
  image: string;
  materials: Record<string, number>;
}

interface Props {
  item: BaseItem;
  rarity?: 'common' | 'green' | 'blue' | 'purple' | 'orange' | 'red';
  prefix?: string; // For future prefix/suffix support
  suffix?: string; // For future prefix/suffix support
  enchantValue?: number; // For future enchantment support
  isConditioned?: boolean; // Whether the item is currently conditioned (conditioning > 0)
}

export default function BaseItemTooltip({
  item,
  rarity = 'common',
  prefix,
  suffix,
  enchantValue,
  isConditioned = false,
}: Props) {
  // Calculate stat multipliers
  const rarityLevels = {
    common: 0,
    green: 1,
    blue: 2,
    purple: 3,
    orange: 4,
    red: 5,
  };

  // Each rarity level adds 25% bonus
  const rarityMultiplier = 1 + (rarityLevels[rarity] * 0.25);
  
  // Conditioning adds another 25% if active
  const conditioningMultiplier = isConditioned ? 1.25 : 1;
  
  // Total multiplier
  const totalMultiplier = rarityMultiplier * conditioningMultiplier;

  // Apply multipliers to stats (round to integers)
  const applyBonus = (value: number | null | undefined): number | null => {
    if (value === null || value === undefined) return null;
    return Math.round(value * totalMultiplier);
  };

  // Build the full item name with prefix/suffix if provided
  const fullName = [prefix, item.name, suffix].filter(Boolean).join(' ');

  // Format damage range for weapons
  const damageText = item.damageMin !== undefined && item.damageMax !== undefined
    ? `${applyBonus(item.damageMin)} - ${applyBonus(item.damageMax)}`
    : null;

  // Format armor value
  const armorText = item.armor ? `Armor: ${applyBonus(item.armor)}` : null;

  // Format durability
  const durabilityValue = applyBonus(item.durability);
  const durabilityText = durabilityValue ? `Durability: ${durabilityValue}` : null;

  // Format conditioning - show current vs max
  const maxConditioning = item.conditioning;
  const currentConditioning = isConditioned && maxConditioning ? maxConditioning : 0;
  const conditioningText = maxConditioning 
    ? `Conditioning: ${currentConditioning} / ${maxConditioning}` 
    : null;

  // Format gold value
  const goldValue = applyBonus(item.gold);
  const goldText = goldValue ? goldValue.toLocaleString() : null;

  // Format materials
  const materialsText = Object.entries(item.materials).map(
    ([material, quantity]) => `${material}: ${quantity}`
  );

  return (
    <span className={styles.wrapper}>
      <img src={item.image} className={styles.icon} alt={fullName} />

      <span className={styles.tooltip}>
        <div className={`${styles.title} ${styles[rarity]}`}>
          {fullName}
        </div>

        {item.type && <div className={styles.type}>Type: {item.type}</div>}

        {damageText && <div>Damage: {damageText}</div>}
        
        {armorText && <div>{armorText}</div>}

        {durabilityText && <div>{durabilityText}</div>}

        {conditioningText && <div>{conditioningText}</div>}

        {enchantValue && (
          <div className={styles.enchant}>+{enchantValue} Damage</div>
        )}

        {materialsText.length > 0 && (
          <div className={styles.materials}>
            <div>Materials:</div>
            {materialsText.map((mat, i) => (
              <div key={i} className={styles.materialItem}>• {mat}</div>
            ))}
          </div>
        )}

        {item.level && <div className={styles.level}>Level {item.level}</div>}
        
        {goldText && (
          <div className={styles.gold}>
            Value {goldText}{' '}
            <img
              src="https://gladiatusfansite.blob.core.windows.net/images/icon_gold.gif"
              alt="Gold"
            />
          </div>
        )}
      </span>
    </span>
  );
}
