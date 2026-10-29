import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateTeamFight } from '../simulateTeamFight';
import { DUNGEON_RULES, dungeonEnrage } from '../dungeonRules';
import { blockChanceAgainst, hitChance } from '../teamChances';
import type { CastAbility, SwingEvent, TeamBattleLog, TeamFighter } from '../teamTypes';
import { makeFighter } from './teamFixtures';
import { seededRandom } from './testRandom';

const noChances = { crit: 0, block: 0, critAvoid: 0 };
/** A player who can't be hurt much and never hurts back. */
const immortal = makeFighter({
  id: 'attacker-0', side: 'attacker', kind: 'player', tactic: 'tank',
  maxLife: 1_000_000_000, dexterity: 0, damageMin: 0, damageMax: 0,
  armourAbsorbMin: 0, armourAbsorbMax: 0, agility: 0, fixedChances: noChances,
});
/** An enemy that always hits for exactly `damage`, never crits or doubles. */
const enemy = (overrides: Partial<TeamFighter> = {}) => makeFighter({
  id: 'defender-0', side: 'defender', kind: 'enemy', maxLife: 1_000_000_000,
  damageMin: 1000, damageMax: 1000, dexterity: 1000, charisma: 0, fixedChances: noChances, ...overrides,
});

const enemySwings = (log: TeamBattleLog, roundNumber: number): SwingEvent[] =>
  log.rounds[roundNumber - 1].actions.flatMap((action) =>
    action.type === 'attack' && action.actorId === 'defender-0' ? action.swings : []);

const casts = (log: TeamBattleLog, text: string): number[] =>
  log.rounds.filter((round) => round.actions.some((action) => action.type === 'cast' && action.text === text)).map((round) => round.index + 1);

// Barkskin Dwarf reports: flat to round 60, then +10% of base damage per round (×2.2 at 72, ×8.8 at 138)
test('dungeon enemies enrage after round 60', () => {
  assert.equal(dungeonEnrage(1), 1);
  assert.equal(dungeonEnrage(60), 1);
  assert.equal(dungeonEnrage(61), 1.1);
  assert.equal(dungeonEnrage(72), 2.2);
  assert.equal(dungeonEnrage(138), 8.8);
});

test('enrage multiplies an enemy’s damage before armour, but not the team’s', () => {
  const armoured = { ...immortal, armourAbsorbMin: 100, armourAbsorbMax: 100 };
  const log = simulateTeamFight([armoured], [enemy({ agility: 0 })], { ...DUNGEON_RULES, maxRounds: 70 }, seededRandom(3));
  assert.deepEqual(enemySwings(log, 60).map((swing) => swing.damage), [900]);
  assert.deepEqual(enemySwings(log, 70).map((swing) => swing.damage), [1900]);
});

test('enrage multiplies the Dexterity an enemy hits with', () => {
  const dwarf = enemy({ dexterity: 550 });
  const skarsburning = makeFighter({ agility: 1584 });
  assert.equal(hitChance(dwarf, skarsburning), 25);
  assert.equal(hitChance(dwarf, skarsburning, 3), 51);
});

test('dungeon fights run long enough for the enrage to finish them', () => {
  assert.ok(DUNGEON_RULES.maxRounds >= 300);
});

// Evil Fairy Queen Clíodhna's report: one cast per round, a clash waits a round, casting costs the attack
const SHIELD: CastAbility = { text: 'shield', rounds: [1], repeatEvery: 5, effects: [{ type: 'shield', absorb: 3000, rounds: 4 }] };
const POUND: CastAbility = { text: 'pound', rounds: [2], repeatEvery: 12, effects: [{ type: 'unknown' }] };
const RAGE: CastAbility = { text: 'rage', rounds: [3], repeatEvery: 12, effects: [{ type: 'empowerNextAttack', multiplier: 2 }] };

test('casts follow Clíodhna’s schedule and replace her attack', () => {
  const boss = enemy({ castAbilities: [SHIELD, POUND, RAGE] });
  const log = simulateTeamFight([immortal], [boss], { ...DUNGEON_RULES, maxRounds: 49 }, seededRandom(1));
  assert.deepEqual(casts(log, 'shield'), [1, 6, 11, 16, 21, 26, 31, 36, 41, 46]);
  assert.deepEqual(casts(log, 'pound'), [2, 14, 27, 39]);
  assert.deepEqual(casts(log, 'rage'), [3, 15, 28, 40]);
  for (const round of log.rounds) {
    const castThisRound = round.actions.some((action) => action.type === 'cast');
    assert.equal(enemySwings(log, round.index + 1).length, castThisRound ? 0 : 1, `round ${round.index + 1}`);
    if (castThisRound) assert.equal(round.actions[0].type, 'cast');
  }
});

test('listed rounds come before the repeat (Corruption: 4, 21, 36, then every 15)', () => {
  const tentacle: CastAbility = { text: 'tentacle', rounds: [4, 21, 36], repeatEvery: 15, effects: [{ type: 'unknown' }] };
  const log = simulateTeamFight([immortal], [enemy({ castAbilities: [tentacle] })], { ...DUNGEON_RULES, maxRounds: 70 }, seededRandom(1));
  assert.deepEqual(casts(log, 'tentacle'), [4, 21, 36, 51, 66]);
});

/** A team member who always hits the boss for exactly `damage` after armour. */
const hitter = (damage: number) => makeFighter({
  id: 'attacker-1', side: 'attacker', tactic: 'damage', dexterity: 1000, charisma: 0,
  damageMin: damage, damageMax: damage, fixedChances: noChances,
});
const shieldedBoss = (overrides: Partial<TeamFighter> = {}) => enemy({
  agility: 0, dexterity: 0, armourAbsorbMin: 0, armourAbsorbMax: 0, castAbilities: [SHIELD], ...overrides,
});

const hitterSwings = (log: TeamBattleLog): SwingEvent[] =>
  log.rounds.flatMap((round) => round.actions.flatMap((action) => (action.type === 'attack' && action.actorId === 'attacker-1' ? action.swings : [])));

test('a shield absorbs 3,000 damage, then the rest of the blow goes through', () => {
  const log = simulateTeamFight([immortal, hitter(1100)], [shieldedBoss()], { ...DUNGEON_RULES, maxRounds: 3 }, seededRandom(1));
  assert.deepEqual(hitterSwings(log).map(({ shieldAbsorbed, shieldBroken, damage }) => ({ shieldAbsorbed, shieldBroken, damage })), [
    { shieldAbsorbed: 1100, shieldBroken: false, damage: 0 },
    { shieldAbsorbed: 1100, shieldBroken: false, damage: 0 },
    { shieldAbsorbed: 800, shieldBroken: true, damage: 300 },
  ]);
});

test('a shield fades after 4 rounds even when not broken', () => {
  const log = simulateTeamFight([immortal, hitter(100)], [shieldedBoss()], { ...DUNGEON_RULES, maxRounds: 5 }, seededRandom(1));
  const absorbedPerRound = hitterSwings(log).map((swing) => swing.shieldAbsorbed);
  assert.deepEqual(absorbedPerRound, [100, 100, 100, 100, 0]);
});

test('rage doubles the next attack after armour; a miss uses it up', () => {
  const rage: CastAbility = { ...RAGE, rounds: [1], repeatEvery: null };
  const armoured = { ...immortal, armourAbsorbMin: 100, armourAbsorbMax: 100 };
  const sureHit = simulateTeamFight([armoured], [enemy({ agility: 0, castAbilities: [rage] })], { ...DUNGEON_RULES, maxRounds: 3 }, seededRandom(1));
  assert.deepEqual([2, 3].map((round) => enemySwings(sureHit, round)[0].damage), [1800, 900]);

  // A 50% hitter: in a fight where round 2 misses and round 3 lands, round 3 is a normal hit
  const evenOdds = enemy({ dexterity: 1000, agility: 0, castAbilities: [rage] });
  const dodger = { ...armoured, agility: 1000 };
  const fights = Array.from({ length: 200 }, (_, seed) =>
    simulateTeamFight([dodger], [evenOdds], { ...DUNGEON_RULES, maxRounds: 3 }, seededRandom(seed + 1)));
  const missThenHit = fights.find((log) => !enemySwings(log, 2)[0].landed && enemySwings(log, 3)[0].landed);
  assert.ok(missThenHit, 'no fight missed in round 2 and hit in round 3');
  assert.equal(enemySwings(missThenHit, 3)[0].damage, 900);
});

// Both reports' block columns: the enemy's block rises 2% per level its attacker is below it, like a player's
test('an enemy blocks more against lower-level attackers', () => {
  const dwarf = enemy({ level: 151, fixedChances: { crit: 33, block: 39, critAvoid: 23 } });
  assert.equal(blockChanceAgainst(dwarf, makeFighter({ level: 147 })), 47);
  assert.equal(blockChanceAgainst(dwarf, makeFighter({ level: 150 })), 41);
  assert.equal(blockChanceAgainst(dwarf, makeFighter({ level: 143 })), 50);
});

/* ----- Effects from the boss pages' numbers (Oak Lord, Valerius Filius Gustavo, Corruption) ----- */

/** Three sturdy team members who never land a hit, so only the boss's casts change their life. */
const bystanders = [0, 1, 2].map((index) => makeFighter({
  id: `attacker-${index}`, side: 'attacker', kind: index === 0 ? 'player' : 'mercenary', tactic: index === 0 ? 'tank' : 'damage',
  maxLife: 1_000_000, dexterity: 0, damageMin: 0, damageMax: 0, armourAbsorbMin: 500, armourAbsorbMax: 500, fixedChances: noChances,
}));
const castOnce = (effects: CastAbility['effects']): CastAbility => ({ text: 'cast', rounds: [1], repeatEvery: null, effects });
const lifeLost = (log: TeamBattleLog, fighterId: string, roundNumber: number) =>
  1_000_000 - log.rounds[roundNumber - 1].endOfRound[fighterId].life;

test('group damage hits everyone for a fixed amount, armour ignored (Oak Lord: 250 to all)', () => {
  const oakLord = enemy({ dexterity: 0, castAbilities: [castOnce([{ type: 'groupDamage', damage: { min: 250, max: 250 }, targets: 'all', drain: false }])] });
  const log = simulateTeamFight(bystanders, [oakLord], { ...DUNGEON_RULES, maxRounds: 1 }, seededRandom(1));
  assert.deepEqual(bystanders.map((fighter) => lifeLost(log, fighter.id, 1)), [250, 250, 250]);
  const cast = log.rounds[0].actions[0];
  assert.equal(cast.type, 'cast');
  assert.equal(cast.type === 'cast' && cast.hits.length, 3);
});

test('group damage on a number of random members hits that many, each once (Valerius: 3 for 1,000–1,500)', () => {
  const team = [...bystanders, makeFighter({ ...bystanders[1], id: 'attacker-3' }), makeFighter({ ...bystanders[1], id: 'attacker-4' })];
  const vortex = castOnce([{ type: 'groupDamage', damage: { min: 1000, max: 1500 }, targets: 3, drain: false }]);
  for (let seed = 1; seed <= 20; seed++) {
    const log = simulateTeamFight(team, [enemy({ dexterity: 0, castAbilities: [vortex] })], { ...DUNGEON_RULES, maxRounds: 1 }, seededRandom(seed));
    const cast = log.rounds[0].actions[0];
    assert.ok(cast.type === 'cast');
    assert.equal(new Set(cast.hits.map((hit) => hit.targetId)).size, 3);
    assert.ok(cast.hits.every((hit) => hit.damage >= 1000 && hit.damage <= 1500));
  }
});

test('a drain heals the boss by the damage it dealt (Oak Lord: 100 to each, healed)', () => {
  const hitter = makeFighter({ id: 'attacker-3', side: 'attacker', tactic: 'damage', dexterity: 1000, charisma: 0, damageMin: 1000, damageMax: 1000, fixedChances: noChances });
  const drain = { text: 'drain', rounds: [2], repeatEvery: null, effects: [{ type: 'groupDamage' as const, damage: { min: 100, max: 100 }, targets: 'all' as const, drain: true }] };
  const oakLord = enemy({ dexterity: 0, agility: 0, armourAbsorbMin: 0, armourAbsorbMax: 0, maxLife: 100_000, castAbilities: [drain] });
  const log = simulateTeamFight([bystanders[0], hitter], [oakLord], { ...DUNGEON_RULES, maxRounds: 2 }, seededRandom(1));
  const cast = log.rounds[1].actions[0];
  assert.ok(cast.type === 'cast');
  assert.equal(cast.healed, 200);
});

test('a stun takes its targets out for that many rounds (Corruption’s tentacle: 3)', () => {
  const tentacle = castOnce([{ type: 'stun', targets: 'random', rounds: 3 }]);
  const log = simulateTeamFight([bystanders[0]], [enemy({ dexterity: 0, castAbilities: [tentacle] })], { ...DUNGEON_RULES, maxRounds: 4 }, seededRandom(1));
  const acted = log.rounds.map((round) => round.actions.some((action) => action.actorId === 'attacker-0'));
  assert.deepEqual(acted, [false, false, false, true]);
});

test('lifesteal heals the boss half of what it deals (Corruption)', () => {
  const hitter = makeFighter({ id: 'attacker-1', side: 'attacker', tactic: 'damage', dexterity: 1000, charisma: 0, damageMin: 3000, damageMax: 3000, fixedChances: noChances });
  const corruption = enemy({ agility: 0, armourAbsorbMin: 0, armourAbsorbMax: 0, maxLife: 100_000, passiveEffects: [{ type: 'lifesteal', percent: 50 }] });
  const target = { ...immortal, armourAbsorbMin: 0, armourAbsorbMax: 0, threatStat: 1_000_000 };
  // A fight where the hitter strikes before the boss in round 1: 3,000 off, then half of the boss's 1,000 back
  const log = Array.from({ length: 50 }, (_, seed) => simulateTeamFight([target, hitter], [corruption], { ...DUNGEON_RULES, maxRounds: 1 }, seededRandom(seed + 1)))
    .find((fight) => fight.rounds[0].actions.findIndex((action) => action.actorId === 'attacker-1') < fight.rounds[0].actions.findIndex((action) => action.actorId === 'defender-0'));
  assert.ok(log);
  assert.equal(log.rounds[0].endOfRound['defender-0'].life, 100_000 - 3000 + 500);
});

test('weakening takes 1% of the group’s damage and healing every round (Corruption)', () => {
  const hitter = makeFighter({ id: 'attacker-1', side: 'attacker', tactic: 'damage', dexterity: 1000, charisma: 0, damageMin: 1000, damageMax: 1000, fixedChances: noChances });
  const corruption = enemy({ dexterity: 0, agility: 0, armourAbsorbMin: 0, armourAbsorbMax: 0, passiveEffects: [{ type: 'weakenEachRound', percent: 1 }] });
  const log = simulateTeamFight([immortal, hitter], [corruption], { ...DUNGEON_RULES, maxRounds: 10 }, seededRandom(1));
  const hitterDamage = (roundNumber: number) => log.rounds[roundNumber - 1].actions
    .flatMap((action) => (action.type === 'attack' && action.actorId === 'attacker-1' ? action.swings : []))[0].damage;
  assert.equal(hitterDamage(1), 990);
  assert.equal(hitterDamage(10), 900);
});

/* ----- Effects recorded for the abilities players have described clearly ----- */

test('a group attack is a normal swing at every member, and costs the boss its attack (Nekromar)', () => {
  const nekromar = enemy({ agility: 0, castAbilities: [castOnce([{ type: 'groupAttack' }])] });
  const sureHitTeam = bystanders.map((fighter) => ({ ...fighter, agility: 0 }));
  const log = simulateTeamFight(sureHitTeam, [nekromar], { ...DUNGEON_RULES, maxRounds: 1 }, seededRandom(1));
  const bossActions = log.rounds[0].actions.filter((action) => action.actorId === 'defender-0');
  assert.deepEqual(bossActions.map((action) => action.type), ['cast', 'attack', 'attack', 'attack']);
  // A normal hit: 1,000 damage less the 500 armour
  assert.deepEqual(sureHitTeam.map((fighter) => lifeLost(log, fighter.id, 1)), [500, 500, 500]);
});

test('attacking the neighbour hits the next fighter after the usual target, without costing the attack (Pyro)', () => {
  const pyro = enemy({ agility: 0, castAbilities: [castOnce([{ type: 'attackNeighbour' }])] });
  const tank = { ...bystanders[0], agility: 0, threatStat: 1_000_000 };
  const log = simulateTeamFight([tank, { ...bystanders[1], agility: 0 }, { ...bystanders[2], agility: 0 }], [pyro], { ...DUNGEON_RULES, maxRounds: 2 }, seededRandom(1));
  const targets = log.rounds.map((round) => round.actions.flatMap((action) => (action.type === 'attack' && action.actorId === 'defender-0' ? [action.targetId] : [])));
  assert.deepEqual(targets, [['attacker-1'], ['attacker-0']]);
});

test('a self-heal restores the boss’s life (Lord Aesteron: 755)', () => {
  const hitter = makeFighter({ id: 'attacker-3', side: 'attacker', tactic: 'damage', dexterity: 1000, charisma: 0, damageMin: 3000, damageMax: 3000, fixedChances: noChances });
  const heal: CastAbility = { text: 'heal', rounds: [2], repeatEvery: null, effects: [{ type: 'selfHeal', amount: { min: 755, max: 755 } }] };
  const aesteron = enemy({ dexterity: 0, agility: 0, armourAbsorbMin: 0, armourAbsorbMax: 0, maxLife: 100_000, castAbilities: [heal] });
  const log = simulateTeamFight([bystanders[0], hitter], [aesteron], { ...DUNGEON_RULES, maxRounds: 2 }, seededRandom(1));
  const cast = log.rounds[1].actions[0];
  assert.ok(cast.type === 'cast');
  assert.equal(cast.healed, 755);
});

test('damage over time ticks at the start of each round it lasts (Nithotep: 124 for 5 rounds)', () => {
  const poison = castOnce([{ type: 'damageOverTime', targets: 'random', damage: { min: 124, max: 124 }, rounds: 5 }]);
  const log = simulateTeamFight([bystanders[0]], [enemy({ dexterity: 0, castAbilities: [poison] })], { ...DUNGEON_RULES, maxRounds: 7 }, seededRandom(1));
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((round) => lifeLost(log, 'attacker-0', round)), [124, 248, 372, 496, 620, 620, 620]);
  assert.ok(log.rounds[1].actions.some((action) => action.type === 'tick' && action.targetId === 'attacker-0' && action.damage === 124));
});

test('a stun can spare the tank (Nekromar’s ice: everyone else for 2 rounds)', () => {
  const ice = castOnce([{ type: 'stun', targets: 'allButTank', rounds: 2 }]);
  const log = simulateTeamFight(bystanders, [enemy({ dexterity: 0, castAbilities: [ice] })], { ...DUNGEON_RULES, maxRounds: 3 }, seededRandom(1));
  const acting = log.rounds.map((round) => round.actions.filter((action) => action.type === 'attack' && action.actorId.startsWith('attacker')).map((action) => action.actorId).sort());
  assert.deepEqual(acting, [['attacker-0'], ['attacker-0'], ['attacker-0', 'attacker-1', 'attacker-2']]);
});
