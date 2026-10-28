import React, { useMemo } from 'react';
import CustomItemTooltip from '../CustomItemTooltip';
import SearchableSelect from '../SearchableSelect/SearchableSelect';
import { affixOptions } from '../SearchableSelect/affixOptions';
import type { PrefixSuffix } from '../Item';
import { CONTRACT_STAT_COLOUR, MERCENARY_TYPES, contractTooltipLines } from '@site/src/utils/mercenaryContract';
import type { CalculatedContract, MercenaryRarity } from '@site/src/utils/mercenaryContract';
import { RARITY_OPTIONS } from '@site/src/utils/rarity';
import type { PlannedContract } from './useTeamState';
import prefixesData from '@site/static/data/items/prefixes.json';
import suffixesData from '@site/static/data/items/suffixes.json';
import styles from './TeamMemberSection.module.css';

const byId = { valueFor: (affix: PrefixSuffix) => String(affix.id) };
const TYPE_NUMBERS = Object.keys(MERCENARY_TYPES).map(Number);

/** A mercenary's contract: type, hidden prefix and suffix, rarity, and the contract icon with its tooltip. */
export default function ContractEditor({ contract, calculated, onChange }: Readonly<{
  contract: PlannedContract | null;
  /** The contract as the game would build it; null when there's nothing to show */
  calculated: CalculatedContract | null;
  onChange: (contract: PlannedContract | null) => void;
}>) {
  const prefixOptions = useMemo(() => affixOptions(prefixesData as PrefixSuffix[], byId), []);
  const suffixOptions = useMemo(() => affixOptions(suffixesData as PrefixSuffix[], byId), []);

  const change = (part: Partial<PlannedContract>) => {
    if (contract) onChange({ ...contract, ...part });
  };
  const idOrUndefined = (value: string) => (value ? Number(value) : undefined);

  return (
    <div className={styles.contract}>
      <label className={styles.field}>
        Mercenary
        <select
          value={contract?.typeNumber ?? ''}
          onChange={(event) => {
            const typeNumber = Number(event.target.value);
            onChange(typeNumber ? { prefixId: undefined, suffixId: undefined, rarity: 'green', ...contract, typeNumber } : null);
          }}
        >
          <option value="">No mercenary</option>
          {TYPE_NUMBERS.map((typeNumber) => (
            <option key={typeNumber} value={typeNumber}>{MERCENARY_TYPES[typeNumber].name}</option>
          ))}
        </select>
      </label>
      {contract && (
        <>
          <SearchableSelect
            options={prefixOptions}
            value={contract.prefixId ? String(contract.prefixId) : ''}
            onChange={(value) => change({ prefixId: idOrUndefined(value) })}
            placeholder="Search prefix..."
            label="Prefix"
          />
          <SearchableSelect
            options={suffixOptions}
            value={contract.suffixId ? String(contract.suffixId) : ''}
            onChange={(value) => change({ suffixId: idOrUndefined(value) })}
            placeholder="Search suffix..."
            label="Suffix"
          />
          <label className={styles.field}>
            Rarity
            <select value={contract.rarity} onChange={(event) => change({ rarity: event.target.value as MercenaryRarity })}>
              {RARITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </>
      )}
      {contract && calculated && (
        <CustomItemTooltip
          name={calculated.name}
          rarity={contract.rarity}
          spriteClass={`item-i-15-${contract.typeNumber}`}
          level={calculated.level}
          stats={contractTooltipLines(calculated)}
          statsColor={CONTRACT_STAT_COLOUR}
        />
      )}
    </div>
  );
}
