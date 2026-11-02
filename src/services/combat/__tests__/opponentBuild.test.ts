import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SIMULATION_WEIGHTS,
  runSimulation,
  type SimulationInput,
} from '../../../components/ItemSimulator/simulationEngine';
import { fightStatsFromCharacterStats } from '../characterToCombatant';
import { getTrainingCap } from '../../../utils/trainingCap';

// Opponent mode must never do worse than the balanced priority build: against
// that build as the opponent, a mirror already wins about half the fights.
for (const characterLevel of [100, 160]) {
  test(`opponent mode beats the priority build at level ${characterLevel}`, () => {
    const trainedStat = getTrainingCap(characterLevel);
    const input: SimulationInput = {
      characterLevel,
      baseStats: {
        strength: trainedStat,
        dexterity: trainedStat,
        agility: trainedStat,
        constitution: trainedStat,
        charisma: trainedStat,
        intelligence: trainedStat,
      },
      activePacts: new Set(),
      weights: DEFAULT_SIMULATION_WEIGHTS,
      powders: { dexterity: true, agility: true, strength: true, intelligence: true },
    };

    const priorityBuild = runSimulation(input);
    const opponentBuild = runSimulation({ ...input, opponent: fightStatsFromCharacterStats(priorityBuild.stats) });

    assert.ok(opponentBuild.winChance! >= 0.49, `win chance ${opponentBuild.winChance}`);
  });
}
