/**
 * Turns a fight log into "beats", one per strike, for the replay to animate. The log
 * is the truth: nothing is re-rolled. Fighters are named by id, and every beat carries
 * every fighter's life after it, so team fights (Turma, dungeons) can use the same shape.
 */
import type { BattleLog, FighterSide } from '@site/src/services/combat/types';

export type FightFighter = { id: string; name: string; maxLife: number; startLife: number };

/** Grows with team fights (heal, cast, tick, stunned…) */
export type BeatKind = 'hit' | 'crit' | 'miss';

export type FightBeat = {
  index: number;
  /** 1-based */
  round: number;
  actorId: string;
  targetId: string;
  kind: BeatKind;
  /** Can go with a crit, as in the text report */
  blocked: boolean;
  /** The extra swing of a double hit */
  doubleHit: boolean;
  /** Damage to the target's life */
  amount: number;
  lifeAfter: Record<string, number>;
};

export type FightTimeline = { fighters: FightFighter[]; beats: FightBeat[] };

// How long each beat stays on screen at 1×, in ms: heavier moments linger
const CRIT_MS = 1100;
const HIT_MS = 850;
const SECOND_SWING_MS = 650;
const MISS_MS = 800;
const BEFORE_FIRST_BEAT_MS = 450;
const ROUND_BREAK_MS = 450;

const OTHER_SIDE: Record<FighterSide, FighterSide> = { attacker: 'defender', defender: 'attacker' };

export function buildFightTimeline(log: BattleLog): FightTimeline {
  // The engine starts both fighters at full life, whatever the snapshots say
  const fighters: FightFighter[] = [
    { id: 'attacker', name: log.attacker.name, maxLife: log.attacker.maxHp, startLife: log.attacker.maxHp },
    { id: 'defender', name: log.defender.name, maxLife: log.defender.maxHp, startLife: log.defender.maxHp },
  ];
  const life: Record<string, number> = Object.fromEntries(fighters.map((fighter) => [fighter.id, fighter.startLife]));

  const beats: FightBeat[] = [];
  for (const round of log.rounds) {
    for (const strike of round.strikes) {
      const targetId = OTHER_SIDE[strike.attackerSide];
      life[targetId] = strike.defenderHpAfter;
      let kind: BeatKind = 'hit';
      if (strike.result === 'miss') kind = 'miss';
      else if (strike.isCrit) kind = 'crit';
      beats.push({
        index: beats.length,
        round: round.roundIndex + 1,
        actorId: strike.attackerSide,
        targetId,
        kind,
        blocked: strike.isBlocked,
        doubleHit: strike.isSecondHalfOfDoubleHit,
        amount: strike.result === 'miss' ? 0 : strike.finalDamage,
        lifeAfter: { ...life },
      });
    }
  }
  return { fighters, beats };
}

/** The beat at `pos`, or null before the start (-1) and past the end. */
export function beatAt(beats: FightBeat[], pos: number): FightBeat | null {
  return pos >= 0 && pos < beats.length ? beats[pos] : null;
}

/** Everyone's life at `pos`: the start before the first beat, the last beat's after the end. */
export function lifeAt(timeline: FightTimeline, pos: number): Record<string, number> {
  const beat = beatAt(timeline.beats, Math.min(pos, timeline.beats.length - 1));
  return beat ? beat.lifeAfter : Object.fromEntries(timeline.fighters.map((fighter) => [fighter.id, fighter.startLife]));
}

function beatDuration(beat: FightBeat): number {
  if (beat.kind === 'crit') return CRIT_MS;
  if (beat.kind === 'miss') return MISS_MS;
  return beat.doubleHit ? SECOND_SWING_MS : HIT_MS;
}

/** How long to wait at 1× before showing beat `pos`. */
export function delayBefore(beats: FightBeat[], pos: number): number {
  const previous = beatAt(beats, pos - 1);
  if (!previous) return BEFORE_FIRST_BEAT_MS;
  const next = beatAt(beats, pos);
  return beatDuration(previous) + (next && next.round !== previous.round ? ROUND_BREAK_MS : 0);
}

export type CaptionTone = 'damage' | 'crit' | 'blocked' | 'miss';
export type BeatCaption = { text: string; tone: CaptionTone; small: boolean };

/** The number that floats up over the target, styled like the text report (blocked in grey). */
export function beatCaption(beat: FightBeat): BeatCaption {
  const crit = beat.kind === 'crit' ? ' CRIT!' : '';
  const caption = (text: string, tone: CaptionTone, small = false): BeatCaption => ({ text, tone, small });
  if (beat.kind === 'miss') return caption('Miss', 'miss');
  if (beat.blocked) return caption(beat.amount > 0 ? `🛡 −${beat.amount}${crit}` : 'Blocked', 'blocked');
  if (beat.amount === 0) return caption('Absorbed', 'miss');
  if (beat.kind === 'crit') return caption(`−${beat.amount}${crit}`, 'crit');
  return caption(`−${beat.amount}`, 'damage', beat.doubleHit);
}

export type BeatReaction = 'rock' | 'rockHard';

/** How the target recoils: only when the blow hurt, harder on a crit. */
export function beatReaction(beat: FightBeat): BeatReaction | null {
  if (beat.kind === 'miss' || beat.amount === 0) return null;
  return beat.kind === 'crit' ? 'rockHard' : 'rock';
}
