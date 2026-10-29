import React from 'react';
import prefixes from '@site/static/data/items/prefixes.json';
import suffixes from '@site/static/data/items/suffixes.json';

/**
 * Affixes whose game id nobody has seen yet carry a made-up id from 9000 up (real ids
 * stop in the low hundreds). Imported items with one of them lose that prefix or suffix.
 */
const PLACEHOLDER_ID_FROM = 9000;

type Affix = { name: string; level: number; id: number };
export type MissingAffix = { name: string; level: number };

/** The affixes still on a placeholder id, by level, then name. */
export function placeholderAffixes(affixes: Affix[]): MissingAffix[] {
  return affixes
    .filter((affix) => affix.id >= PLACEHOLDER_ID_FROM)
    .map(({ name, level }) => ({ name, level }))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}

function AffixList({ kind, affixes }: { readonly kind: string; readonly affixes: MissingAffix[] }) {
  if (affixes.length === 0) return <p>All {kind} ids are known.</p>;
  return (
    <ul>
      {affixes.map((affix) => <li key={affix.name}>{affix.name} (Level {affix.level})</li>)}
    </ul>
  );
}

/** The prefixes and suffixes whose game ids we don't know, built from the item data. */
export default function MissingAffixIds() {
  const missingPrefixes = placeholderAffixes(prefixes);
  const missingSuffixes = placeholderAffixes(suffixes);
  return (
    <>
      <p>
        Character imports match items by the game’s prefix and suffix ids. We don’t know the ids of these yet, so
        an imported item with one of them loses it and shows the wrong stats. When you import a character wearing
        one, the character page shows a notice with buttons to report it.
      </p>
      <h3>Prefixes ({missingPrefixes.length})</h3>
      <AffixList kind="prefix" affixes={missingPrefixes} />
      <h3>Suffixes ({missingSuffixes.length})</h3>
      <AffixList kind="suffix" affixes={missingSuffixes} />
    </>
  );
}
