import { areAbilitiesSimulated } from '@site/src/data/dungeons';
import { isPassiveEffect, type CastEffect, type DungeonEnemy, type PassiveEffect } from '@site/src/types/dungeons';
import type { CastAbility, TeamFighter } from './teamTypes';

/**
 * A boss's abilities as the engine runs them, or none when any one of them is still unknown:
 * a boss half-simulated would look more trustworthy than it is (the card warns instead).
 */
function simulatedAbilities(enemy: DungeonEnemy): { castAbilities: CastAbility[]; passiveEffects: PassiveEffect[] } {
  if (!areAbilitiesSimulated(enemy)) return { castAbilities: [], passiveEffects: [] };
  const castAbilities: CastAbility[] = [];
  const passiveEffects: PassiveEffect[] = [];
  for (const { gameText, rounds, repeatEvery, effects = [] } of enemy.abilities) {
    passiveEffects.push(...effects.filter(isPassiveEffect));
    const castEffects = effects.filter((effect): effect is CastEffect => !isPassiveEffect(effect));
    if (castEffects.length > 0) castAbilities.push({ text: gameText, rounds, repeatEvery, effects: castEffects });
  }
  return { castAbilities, passiveEffects };
}

/** A dungeon enemy as the lone defender of a team fight; its panel's chances are used as shown. */
export function dungeonEnemyToFighter(enemy: DungeonEnemy, image: string | null): TeamFighter {
  return {
    id: 'defender-0',
    name: enemy.name,
    side: 'defender',
    kind: 'enemy',
    tactic: 'damage',
    mercenaryClass: null,
    level: enemy.level,
    image,
    maxLife: enemy.life,
    damageMin: enemy.damage.min,
    damageMax: enemy.damage.max,
    armour: enemy.armour,
    armourAbsorbMin: enemy.armourAbsorb.min,
    armourAbsorbMax: enemy.armourAbsorb.max,
    strength: enemy.strength,
    dexterity: enemy.dexterity,
    agility: enemy.agility,
    constitution: enemy.constitution,
    charisma: enemy.charisma,
    intelligence: enemy.intelligence,
    critValue: 0,
    blockValue: 0,
    resilience: 0,
    healing: 0,
    critHealValue: 0,
    threatStat: enemy.threat,
    fixedChances: { crit: enemy.critChance, block: enemy.blockChance, critAvoid: enemy.critAvoidChance },
    abilities: [],
    ...simulatedAbilities(enemy),
  };
}
