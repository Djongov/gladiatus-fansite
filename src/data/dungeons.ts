/** The single reader of static/data/dungeons.json. */
import dungeonsData from '@site/static/data/dungeons.json';
import type { CountryKey, Dungeon, DungeonAbility, DungeonEnemy, DungeonsData } from '@site/src/types/dungeons';

const DATA = dungeonsData as DungeonsData;
const COUNTRY_ORDER: CountryKey[] = ['italy', 'africa', 'germania', 'britannia'];
const DUNGEONS: Dungeon[] = COUNTRY_ORDER.flatMap((key) => DATA[key].dungeons);

export type DungeonCountry = { key: CountryKey; name: string; dungeons: Dungeon[] };

export function allDungeons(): Dungeon[] {
  return DUNGEONS;
}

/** The dungeons by country, in the game's order (Italy, Africa, Germania, Britannia). */
export function dungeonCountries(): DungeonCountry[] {
  return COUNTRY_ORDER.map((key) => ({ key, name: DATA[key].name, dungeons: DATA[key].dungeons }));
}

/** By slug, e.g. "africa-dungeons/fairground". */
export function findDungeon(slug: string): Dungeon | null {
  return DUNGEONS.find((dungeon) => dungeon.slug === slug) ?? null;
}

export function findDungeonEnemy(slug: string, enemyId: string): DungeonEnemy | null {
  return findDungeon(slug)?.enemies.find((enemy) => enemy.id === enemyId) ?? null;
}

/** An ability is known once a report or its page's numbers give it effects. */
const isAbilityKnown = (ability: DungeonAbility): boolean => (ability.effects?.length ?? 0) > 0;

/** Every ability is known, so the simulator fights the boss with all of them (none recorded counts too). */
export function areAbilitiesSimulated(enemy: DungeonEnemy): boolean {
  return enemy.abilities.every(isAbilityKnown);
}

/** Abilities we can't simulate yet: no effects worked out. */
export function unknownAbilities(enemy: DungeonEnemy): DungeonAbility[] {
  return enemy.abilities.filter((ability) => !isAbilityKnown(ability));
}

/** Simulated abilities whose effect is still a guess: they only cost the boss its turn. */
export function unconfirmedAbilities(enemy: DungeonEnemy): DungeonAbility[] {
  return enemy.abilities.filter((ability) => ability.effects?.some((effect) => effect.type === 'unknown'));
}

/** Its page lists no abilities at all: it may have none, or nobody has recorded them. */
export const hasNoAbilitiesRecorded = (enemy: DungeonEnemy): boolean => enemy.isBoss && enemy.abilities.length === 0;

/** Anchor of a boss on the Data missing page */
export const missingDataAnchor = (enemy: DungeonEnemy): string => `boss-${enemy.id}`;
