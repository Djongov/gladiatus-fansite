import React, { useMemo, useState } from 'react';
import type { Enemy } from '@site/src/types/expeditions';
import type { ActiveCharacterRecord } from '@site/src/hooks/useActiveCharacter';
import type { BonusId } from '@site/src/components/ExpeditionBonuses/ExpeditionBonuses';
import {
  decodeCharacterState,
  calculateCharacterStats,
} from '@site/src/components/CharacterPlanner/useCharacterState';
import { simulateBattle } from '@site/src/services/combat/simulateBattle';
import { characterToCombatant } from '@site/src/services/combat/characterToCombatant';
import { rollEnemyAsCombatant } from '@site/src/services/combat/enemyToCombatant';
import type { BattleLog, Combatant } from '@site/src/services/combat/types';
import BattleReport from '@site/src/components/BattleReport/BattleReport';
import ReportModal from './ReportModal';
import styles from './AttackModal.module.css';

export type Rewards = { gold: number; experience: number; honour: number };

type PveProps = {
  mode: 'pve';
  enemy: Enemy;
  character: ActiveCharacterRecord;
  bonuses: Set<BonusId>;
  onClose: () => void;
};

type PvpProps = {
  mode: 'pvp';
  attacker: Combatant;
  defender: Combatant;
  onClose: () => void;
};

type Props = PveProps | PvpProps;

function rollInRange(range: { min: number; max: number }): number {
  if (range.max <= range.min) return range.min;
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

type FightResult = { log: BattleLog | null; rewards: Rewards | null; error: string | null };

/**
 * The fight is rolled once, when the report opens: a parent re-rendering (a new bonuses
 * Set, a refreshed character) must never swap the fight under the open report and its replay.
 */
function usePveResult(enemy: Enemy, character: ActiveCharacterRecord, bonuses: Set<BonusId>): FightResult {
  const [result] = useState<FightResult>(() => {
    let decoded;
    try {
      decoded = decodeCharacterState(character.encoded, character.identity.name);
    } catch (err) {
      console.warn('[AttackModal] failed to decode active character:', err);
      return { log: null, rewards: null, error: 'Could not load your character data. Please re-import via /character.' };
    }
    if (!decoded) {
      return { log: null, rewards: null, error: 'Could not load your character data. Please re-import via /character.' };
    }

    const stats = calculateCharacterStats(
      decoded.items,
      decoded.level,
      decoded.baseStats,
      decoded.pacts,
    );
    const playerCombatant = characterToCombatant({
      identity: decoded.identity,
      level: decoded.level,
      stats,
    });

    const rolled = rollEnemyAsCombatant(enemy);
    if (!rolled) {
      return { log: null, rewards: null, error: 'No combat data available for this enemy yet.' };
    }

    const log = simulateBattle(playerCombatant, rolled.combatant);

    const rewards: Rewards | null = log.outcome === 'attacker_wins'
      ? (() => {
          const goldMult = bonuses.has('gold') ? 1.3 : 1.0;
          const xpMult = bonuses.has('experience') ? 1.3 : 1.0;
          const honourMult = bonuses.has('honour') ? 1.2 : 1.0;
          return {
            gold: Math.ceil(rollInRange(enemy.gold) * goldMult),
            experience: Math.ceil(rollInRange(enemy.experience) * xpMult),
            honour: Math.ceil(rollInRange(enemy.honour) * honourMult),
          };
        })()
      : null;

    return { log, rewards, error: null };
  });
  return result;
}

function usePvpResult(attacker: Combatant, defender: Combatant): FightResult {
  const [result] = useState<FightResult>(() => {
    const log = simulateBattle(attacker, defender, {
      maxRounds: 15,
      firstAttacker: 'coinflip',
    });
    return { log, rewards: null, error: null };
  });
  return result;
}

export default function AttackModal(props: Props): React.ReactElement {
  // Stable placeholders so we can always call both hooks (Rules of Hooks).
  const placeholderEnemy = useMemo<Enemy>(() => ({
    name: '', image: '', isBoss: false,
    level: { min: 0, max: 0 }, gold: { min: 0, max: 0 }, experience: { min: 0, max: 0 }, honour: { min: 0, max: 0 },
    strength: { min: 0, max: 0 }, dexterity: { min: 0, max: 0 }, agility: { min: 0, max: 0 },
    constitution: { min: 0, max: 0 }, charisma: { min: 0, max: 0 }, intelligence: { min: 0, max: 0 },
    armour: { min: 0, max: 0 }, damage: { min: { min: 0, max: 0 }, max: { min: 0, max: 0 } },
    itemLevelDrop: null, life: { min: 0, max: 0 }, critRaw: null, blockRaw: null, avoidCritRaw: null,
  }), []);
  const placeholderCharacter = useMemo<ActiveCharacterRecord>(() => ({
    v: 1, encoded: '', identity: { name: '', gender: 'male' }, level: 1, savedAt: 0,
  }), []);
  const placeholderCombatant = useMemo<Combatant>(() => ({
    name: '', level: 1, hp: 0, maxHp: 0, damageMin: 0, damageMax: 0,
    armour: 0, armourAbsorbMin: 0, armourAbsorbMax: 0,
    strength: 0, dexterity: 0, agility: 0, constitution: 0, charisma: 0, intelligence: 0,
    critChance: 0, blockChance: 0, critAvoidChance: 0,
  }), []);

  const pve = usePveResult(
    props.mode === 'pve' ? props.enemy : placeholderEnemy,
    props.mode === 'pve' ? props.character : placeholderCharacter,
    props.mode === 'pve' ? props.bonuses : new Set<BonusId>(),
  );
  const pvp = usePvpResult(
    props.mode === 'pvp' ? props.attacker : placeholderCombatant,
    props.mode === 'pvp' ? props.defender : placeholderCombatant,
  );

  const { log, rewards, error } = props.mode === 'pve' ? pve : pvp;
  const title = props.mode === 'pve'
    ? `Attacking ${props.enemy.name}`
    : `Attacking ${props.defender.name}`;

  return (
    <ReportModal title={title} onClose={props.onClose}>
      {error && <div className={styles.error}>{error}</div>}
      {log && <BattleReport log={log} rewards={rewards} />}
    </ReportModal>
  );
}
