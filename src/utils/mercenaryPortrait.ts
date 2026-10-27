import type { Tactic } from '@site/src/services/combat/teamTypes';

/** The contract's subcategory: contract "15-6" → 6. */
function contractNumber(contractBaseItemId: string | undefined): number | null {
  const number = Number(contractBaseItemId?.split('-')[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
}

/** The game's own mercenary picture; its number is the contract's subcategory (contract "15-6" → merc/6.jpg). */
export function mercenaryPortraitUrl(profileUrl: string | undefined, contractBaseItemId: string | undefined): string | null {
  const portraitNumber = contractNumber(contractBaseItemId);
  if (!profileUrl || portraitNumber === null) return null;
  try {
    return `https://${new URL(profileUrl).hostname}/cdn/img/npc/merc/${portraitNumber}.jpg`;
  } catch {
    return null;
  }
}

const CONTRACTS_PER_COUNTRY = 5;
/** Each country's contracts run tank, healer, then three damage dealers (the game's contract sprites group the same way). */
const CLASS_BY_COUNTRY_POSITION: Tactic[] = ['tank', 'healer', 'damage', 'damage', 'damage'];

/** What the mercenary is (Grandmaster 15-16 → tank), regardless of the tactic it was given. */
export function mercenaryClassFromContract(contractBaseItemId: string | undefined): Tactic | null {
  const number = contractNumber(contractBaseItemId);
  return number === null ? null : CLASS_BY_COUNTRY_POSITION[(number - 1) % CONTRACTS_PER_COUNTRY];
}
