import React, { useMemo, useState } from 'react';
import CustomItemTooltip from './CustomItemTooltip';
import SearchableSelect from './SearchableSelect/SearchableSelect';
import { affixOptions } from './SearchableSelect/affixOptions';
import type { PrefixSuffix } from './Item';
import { CONTRACT_STAT_COLOUR, calculateMercenaryContract, contractTooltipLines } from '@site/src/utils/mercenaryContract';
import type { MercenaryRarity } from '@site/src/utils/mercenaryContract';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import { RARITY_OPTIONS } from '@site/src/utils/rarity';
import styles from '@site/src/css/ConsumableCalculator.module.css';

type MercenaryCalculatorProps = {
  /** N of contract "15-N" */
  typeNumber: number;
  defaultPrefix?: string;
  defaultSuffix?: string;
  defaultRarity?: MercenaryRarity;
};

const prefixes = prefixesData as PrefixSuffix[];
const suffixes = suffixesData as PrefixSuffix[];

/** A mercenary contract of one type: pick its hidden prefix, suffix and rarity, see the contract the game builds. */
export default function MercenaryCalculator({
  typeNumber,
  defaultPrefix = 'Belisarius',
  defaultSuffix = 'of Merit',
  defaultRarity = 'green',
}: Readonly<MercenaryCalculatorProps>) {
  const [prefixName, setPrefixName] = useState(defaultPrefix);
  const [suffixName, setSuffixName] = useState(defaultSuffix);
  const [rarity, setRarity] = useState<MercenaryRarity>(defaultRarity);

  const prefixOptions = useMemo(() => affixOptions(prefixes), []);
  const suffixOptions = useMemo(() => affixOptions(suffixes), []);

  const prefix = prefixes.find((affix) => affix.name === prefixName);
  const suffix = suffixes.find((affix) => affix.name === suffixName);
  const contract = calculateMercenaryContract({ typeNumber, prefix, suffix, rarity });

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <SearchableSelect options={prefixOptions} value={prefixName} onChange={setPrefixName} placeholder="Search prefix..." label="Prefix" />
        <SearchableSelect options={suffixOptions} value={suffixName} onChange={setSuffixName} placeholder="Search suffix..." label="Suffix" />
        <div className={styles.control}>
          <label htmlFor={`mercenary-calc-rarity-${typeNumber}`}>Rarity:</label>
          <select
            id={`mercenary-calc-rarity-${typeNumber}`}
            value={rarity}
            onChange={(event) => setRarity(event.target.value as MercenaryRarity)}
          >
            {RARITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.derived}>
        Level {contract.level} = {prefix?.level ?? 0} + {suffix?.level ?? 0} + 1
      </div>
      <div className={styles.preview}>
        <CustomItemTooltip
          name={contract.name}
          rarity={rarity}
          spriteClass={`item-i-15-${typeNumber}`}
          level={contract.level}
          stats={contractTooltipLines(contract)}
          statsColor={CONTRACT_STAT_COLOUR}
        />
      </div>
    </div>
  );
}
