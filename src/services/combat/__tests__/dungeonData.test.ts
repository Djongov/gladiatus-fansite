import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { allDungeons, areAbilitiesSimulated, dungeonCountries, findDungeon, findDungeonEnemy } from '@site/src/data/dungeons';
import type { DungeonLink } from '@site/src/types/dungeons';

const DOCS_DIR = path.join(process.cwd(), 'docs');
const DUNGEON_DOCS_DIR = path.join(DOCS_DIR, 'dungeons');

function docFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return docFiles(full);
    return /\.mdx?$/.test(name) ? [full] : [];
  });
}

const frontMatterSlug = (file: string): string | null =>
  readFileSync(file, 'utf8').match(/^slug:\s*"?([^"\s]+)"?\s*$/m)?.[1] ?? null;

const isDungeonPage = (file: string): boolean =>
  !/-dungeons\.mdx?$/.test(file) && !file.includes('zagrashs-fort-guide');

const kebabCase = (name: string): string =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['`’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

test('every dungeon page has data', () => {
  const pages = docFiles(DUNGEON_DOCS_DIR).filter((file) => path.dirname(file) !== DUNGEON_DOCS_DIR && isDungeonPage(file));
  assert.equal(pages.length, 34);
  for (const page of pages) {
    const slug = frontMatterSlug(page)!.replace(/^\/dungeons\//, '');
    assert.ok(findDungeon(slug), `no data for ${slug}`);
  }
  assert.equal(allDungeons().length, 34);
});

test('every link path resolves', () => {
  const slugs = new Set(docFiles(DOCS_DIR).map(frontMatterSlug).filter(Boolean));
  for (const dungeon of allDungeons()) {
    const links: DungeonLink[] = [
      dungeon.parentExpedition, dungeon.advancedDungeon, dungeon.advancedDungeonOf,
      ...dungeon.previousDungeons, ...dungeon.nextDungeons,
    ].filter((link): link is DungeonLink => link !== null);
    for (const link of links) assert.ok(slugs.has(link.path), `${dungeon.slug}: ${link.name} → ${link.path}`);
  }
});

test('ranges and stats are sane', () => {
  const isRange = (range: { min: number; max: number } | null) => range === null || range.min <= range.max;
  for (const dungeon of allDungeons()) {
    assert.ok(isRange(dungeon.enemyLevels.levels) && isRange(dungeon.minionDrop.levels) && isRange(dungeon.bossDrop.levels), dungeon.slug);
    const ids = new Set<string>();
    for (const enemy of dungeon.enemies) {
      const where = `${dungeon.slug}/${enemy.id}`;
      // Two enemies can share a name (Fire Demon, blue and red): their ids add the variant
      assert.ok(enemy.id === kebabCase(enemy.name) || enemy.id.startsWith(`${kebabCase(enemy.name)}-`), where);
      assert.ok(!ids.has(enemy.id), `duplicate ${where}`);
      ids.add(enemy.id);
      assert.ok(enemy.damage.min <= enemy.damage.max, `${where} damage`);
      assert.ok(enemy.armourAbsorb.min <= enemy.armourAbsorb.max, `${where} absorb`);
      assert.ok(enemy.life > enemy.level, `${where} life`);
      for (const attribute of [enemy.strength, enemy.dexterity, enemy.agility, enemy.constitution, enemy.charisma, enemy.intelligence]) {
        assert.ok(attribute >= 0, `${where} attribute`);
      }
      for (const chance of [enemy.critChance, enemy.blockChance, enemy.critAvoidChance]) {
        assert.ok(chance >= 0 && chance <= 100, `${where} chance`);
      }
    }
  }
});

test('every card resolves', () => {
  for (const page of docFiles(DUNGEON_DOCS_DIR).filter((file) => file.endsWith('.mdx'))) {
    const text = readFileSync(page, 'utf8');
    for (const [, slug, enemy] of text.matchAll(/<DungeonEnemy\s+slug="([^"]+)"\s+enemy="([^"]+)"/g)) {
      assert.ok(findDungeonEnemy(slug, enemy), `${page}: ${slug}/${enemy}`);
    }
    for (const [, slug] of text.matchAll(/<DungeonFacts\s+slug="([^"]+)"/g)) {
      assert.ok(findDungeon(slug), `${page}: ${slug}`);
    }
  }
});

test('unknown enemies and dungeons are null', () => {
  assert.equal(findDungeonEnemy('africa-dungeons/fairground', 'nope'), null);
  assert.equal(findDungeon('nowhere'), null);
});

// Each levels line carries its own mark: "✓ Verified", none, or a trailing "?"; "???" is unknown
test('every levels line keeps its own verified / uncertain mark', () => {
  const alphaOmega = findDungeon('germania-dungeons/alpha-omega')!;
  assert.equal(alphaOmega.minionDrop.status, 'unverified');
  assert.equal(alphaOmega.bossDrop.status, 'verified');
  const trueOwner = findDungeon('italy-dungeons/the-true-owner')!;
  assert.equal(trueOwner.minionDrop.status, 'unverified');
  assert.equal(trueOwner.bossDrop.status, 'verified');
  assert.equal(trueOwner.enemyLevels.status, 'verified');
  const greatRitual = findDungeon('britannia-dungeons/the-great-ritual')!;
  assert.deepEqual(greatRitual.minionDrop, { levels: { min: 262, max: 268 }, status: 'uncertain' });
  assert.equal(greatRitual.bossDrop.levels, null);
});

test("Corruption's abilities are in the data", () => {
  const corruption = findDungeonEnemy('africa-dungeons/in-the-heart-of-decay', 'corruption')!;
  assert.equal(corruption.abilities.length, 3);
  assert.equal(corruption.abilities[0].repeatEvery, 1);
  assert.deepEqual(corruption.abilities[2].rounds, [4, 21, 36]);
  assert.equal(corruption.abilities[2].repeatEvery, 15);
});

test('dungeons are listed by country, in the game order, for the simulator dropdowns', () => {
  const countries = dungeonCountries();
  assert.deepEqual(countries.map((country) => [country.key, country.name, country.dungeons.length]), [
    ['italy', 'Italy', 10], ['africa', 'Africa', 8], ['germania', 'Germania', 7], ['britannia', 'Britannia', 9],
  ]);
  assert.equal(countries.flatMap((country) => country.dungeons).length, allDungeons().length);
});

const EFFECT_TYPES = new Set(['shield', 'empowerNextAttack', 'groupAttack', 'attackNeighbour', 'groupDamage', 'damageOverTime', 'selfHeal', 'stun', 'unknown', 'lifesteal', 'weakenEachRound']);

test('ability effects use the known effect types', () => {
  for (const dungeon of allDungeons()) {
    for (const enemy of dungeon.enemies) {
      for (const ability of enemy.abilities) {
        assert.ok(!('effect' in ability), `${enemy.name}: "effect" should be "effects"`);
        for (const effect of ability.effects ?? []) assert.ok(EFFECT_TYPES.has(effect.type), `${enemy.name}: ${effect.type}`);
      }
    }
  }
});

// Only bosses with every ability worked out are simulated with them; the rest are on the Data missing page
test('the bosses simulated with their abilities', () => {
  const simulated = allDungeons().flatMap((dungeon) => dungeon.enemies)
    .filter((enemy) => enemy.abilities.length > 0 && areAbilitiesSimulated(enemy))
    .map((enemy) => enemy.name);
  assert.deepEqual(simulated, ['Corruption', 'Oak Lord', 'Valerius Filius Gustavo', 'Evil Fairy Queen Clíodhna']);
});
