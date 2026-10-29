import type { PrefixSuffix } from '../Item';
import type { SelectOpt } from './SearchableSelect';

/** How every prefix/suffix dropdown names an affix: "Belisarius (Lv. 96)". */
export function affixLabel(affix: Pick<PrefixSuffix, 'name' | 'level'>): string {
  return `${affix.name} (Lv. ${affix.level})`;
}

/** Dropdown options for a prefix or suffix list, headed by an empty choice. Values are names unless `valueFor` says otherwise. */
export function affixOptions(
  affixes: PrefixSuffix[],
  { noneLabel = 'None', valueFor = (affix: PrefixSuffix) => affix.name }: { noneLabel?: string; valueFor?: (affix: PrefixSuffix) => string } = {},
): SelectOpt[] {
  return [
    { value: '', label: noneLabel },
    ...affixes.map((affix) => ({ value: valueFor(affix), label: affixLabel(affix) })),
  ];
}
