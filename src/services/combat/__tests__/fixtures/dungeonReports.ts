/**
 * The fighters of three live dungeon reports, as their headers show them
 * (sample/evil-fairy-queen.txt, sample/barkskin-dwarf-round-72.txt,
 * sample/barkskin-dwarf-lost-fight.txt). Chances are the panel's figures.
 */
import type { CastAbility, Tactic, TeamFighter } from '../../teamTypes';
import { makeFighter } from '../teamFixtures';

type PanelStats = {
  name: string;
  level: number;
  life: number;
  attributes: [strength: number, dexterity: number, agility: number, constitution: number, charisma: number, intelligence: number];
  absorb: [min: number, max: number];
  damage: [min: number, max: number];
  crit: number;
  block: number;
  critAvoid: number;
  threat: number;
};

function fromPanel(id: string, kind: TeamFighter['kind'], tactic: Tactic, stats: PanelStats, extra: Partial<TeamFighter> = {}): TeamFighter {
  const [strength, dexterity, agility, constitution, charisma, intelligence] = stats.attributes;
  return makeFighter({
    id,
    name: stats.name,
    side: id.startsWith('attacker') ? 'attacker' : 'defender',
    kind,
    tactic,
    level: stats.level,
    maxLife: stats.life,
    strength, dexterity, agility, constitution, charisma, intelligence,
    armourAbsorbMin: stats.absorb[0],
    armourAbsorbMax: stats.absorb[1],
    damageMin: stats.damage[0],
    damageMax: stats.damage[1],
    fixedChances: { crit: stats.crit, block: stats.block, critAvoid: stats.critAvoid },
    threatStat: stats.threat,
    ...extra,
  });
}

/** Grandmaster's 50% crit-heal chance is the cap; any value past it gives the same */
const GRANDMASTER_HEALING = { healing: 7348, critHealValue: 2000 };

const skarsburning = (level: 141 | 143, life: number, extra: Omit<PanelStats, 'name' | 'level' | 'life'>) =>
  fromPanel('attacker-0', 'player', 'tank', { name: 'Skarsburning', level, life, ...extra });

const grandmaster = (life: number) => fromPanel('attacker-1', 'mercenary', 'healer', {
  name: 'Grandmaster', level: 147, life, attributes: [405, 266, 828, 570, 876, 426],
  absorb: [260, 317], damage: [396, 476], crit: 2, block: 21, critAvoid: 8, threat: 0,
}, GRANDMASTER_HEALING);

const samnit = (index: number, stats: Omit<PanelStats, 'name' | 'critAvoid'>) =>
  fromPanel(`attacker-${index}`, 'mercenary', 'damage', { name: 'Samnit', critAvoid: 6, ...stats });

/** Clíodhna's three casts, as her report shows them */
export const CLIODHNA_ABILITIES: CastAbility[] = [
  { text: 'shield', rounds: [1], repeatEvery: 5, effects: [{ type: 'shield', absorb: 3000, rounds: 4 }] },
  { text: 'pound', rounds: [2], repeatEvery: 12, effects: [{ type: 'unknown' }] },
  { text: 'rage', rounds: [3], repeatEvery: 12, effects: [{ type: 'empowerNextAttack', multiplier: 2 }] },
];

/** 20.10.2026: Skarsburning, Grandmaster and three Samnits beat Clíodhna (level 149) in 49 rounds. */
export const CLIODHNA_FIGHT = {
  team: [
    skarsburning(141, 32620, {
      attributes: [1138, 1161, 1161, 1161, 933, 1161], absorb: [421, 514], damage: [715, 795],
      crit: 38, block: 48, critAvoid: 25, threat: 1046,
    }),
    grandmaster(15564),
    samnit(2, { level: 150, life: 6630, attributes: [504, 888, 640, 192, 460, 229], absorb: [238, 291], damage: [787, 869], crit: 41, block: 5, threat: 322 }),
    samnit(3, { level: 154, life: 6685, attributes: [469, 898, 644, 189, 437, 235], absorb: [247, 302], damage: [823, 909], crit: 36, block: 13, threat: 387 }),
    samnit(4, { level: 141, life: 7128, attributes: [404, 907, 663, 205, 460, 250], absorb: [226, 277], damage: [813, 901], crit: 43, block: 3, threat: 322 }),
  ],
  enemy: fromPanel('defender-0', 'enemy', 'damage', {
    name: 'Evil Fairy Queen Clíodhna', level: 149, life: 23033, attributes: [768, 1197, 1107, 1155, 973, 974],
    absorb: [244, 299], damage: [3639, 3949], crit: 30, block: 33, critAvoid: 26, threat: 50,
  }, { castAbilities: CLIODHNA_ABILITIES }),
};

const SKARSBURNING_143 = {
  attributes: [1229, 1229, 1584, 1229, 1229, 1229] as PanelStats['attributes'],
  absorb: [449, 548] as PanelStats['absorb'],
  damage: [799, 897] as PanelStats['damage'],
  crit: 40, block: 46, critAvoid: 25, threat: 1274,
};

/** 27.10.2026: Skarsburning, Grandmaster and one Samnit beat the Barkskin Dwarf (level 151) in 72 rounds. */
export const DWARF_WIN = {
  team: [
    skarsburning(143, 34250, SKARSBURNING_143),
    grandmaster(15714),
    samnit(2, { level: 150, life: 8090, attributes: [569, 903, 650, 256, 466, 236], absorb: [243, 298], damage: [901, 995], crit: 36, block: 4, threat: 410 }),
  ],
  enemy: fromPanel('defender-0', 'enemy', 'damage', {
    name: 'Barkskin Dwarf', level: 151, life: 20533, attributes: [1115, 550, 555, 824, 487, 351],
    absorb: [807, 986], damage: [1977, 2146], crit: 33, block: 39, critAvoid: 23, threat: 50,
  }),
};

/** 27.10.2026: Skarsburning and Grandmaster alone lose to the Barkskin Dwarf (level 150) in round 140. */
export const DWARF_LOSS = {
  team: [skarsburning(143, 34250, SKARSBURNING_143), grandmaster(15714)],
  enemy: fromPanel('defender-0', 'enemy', 'damage', {
    name: 'Barkskin Dwarf', level: 150, life: 20297, attributes: [1117, 551, 557, 825, 489, 350],
    absorb: [807, 986], damage: [1976, 2148], crit: 32, block: 36, critAvoid: 28, threat: 50,
  }),
};
