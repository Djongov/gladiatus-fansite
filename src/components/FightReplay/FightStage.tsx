import React, { useId, useMemo } from 'react';
import type { BattleLog } from '@site/src/services/combat/types';
import { IMAGE_CDN_PREFIX } from '@site/src/components/EnemyPortrait/EnemyPortrait';
import {
  beatAt,
  beatCaption,
  beatReaction,
  buildFightTimeline,
  lifeAt,
  type FightBeat,
  type FightFighter,
} from './fightTimeline';
import { REPLAY_SPEEDS } from './fightReplayPrefs';
import { useFightPlayer } from './useFightPlayer';
import styles from './FightStage.module.css';

/**
 * A fighter's image as a full URL: the player's is already a full Gladiatus costume URL,
 * enemy images are CDN-relative paths (e.g. `Expeditions/Italy/Grimwood/Rat.jpg`).
 */
function resolveImage(image: string | undefined): string | null {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${IMAGE_CDN_PREFIX}${image}`;
}

const REACTION_CLASS = { rock: styles.rock, rockHard: styles.rockHard };
const CAPTION_CLASS = { damage: styles.captionDamage, crit: styles.captionCrit, blocked: styles.captionBlocked, miss: styles.captionMiss };

/** One side of the stage: name banner, portrait (moving with the beat), life bar. */
function FighterCard({ fighter, image, life, beat, pos, lungeClass }: {
  readonly fighter: FightFighter;
  readonly image: string | null;
  readonly life: number;
  readonly beat: FightBeat | null;
  readonly pos: number;
  /** The lunge toward the other side of the stage */
  readonly lungeClass: string;
}) {
  const isActor = beat?.actorId === fighter.id;
  const isTarget = beat?.targetId === fighter.id;
  const reaction = isTarget && beat ? beatReaction(beat) : null;
  const caption = isTarget && beat ? beatCaption(beat) : null;
  const motionClass = [isActor && lungeClass, reaction && REACTION_CLASS[reaction]].filter(Boolean).join(' ');

  return (
    <div className={styles.fighter}>
      <div className="player_name_bg">
        <div className="playername">{fighter.name}</div>
      </div>
      <div className={styles.portraitArea}>
        {/* The key retriggers the beat's animations on every position */}
        <div
          key={`motion-${pos}`}
          className={`${styles.portrait} ${motionClass} ${life <= 0 ? styles.defeated : ''}`}
          style={image ? { backgroundImage: `url(${image})` } : undefined}
        />
        {caption && (
          <div
            key={`caption-${pos}`}
            className={`${styles.caption} ${CAPTION_CLASS[caption.tone]} ${caption.small ? styles.captionSmall : ''}`}
          >
            {caption.text}
          </div>
        )}
      </div>
      <div className={styles.lifeTrack}>
        <div className={styles.lifeFill} style={{ width: `${fighter.maxLife > 0 ? (life / fighter.maxLife) * 100 : 0}%` }} />
      </div>
      <div className={styles.lifeText}>{life} / {fighter.maxLife}</div>
    </div>
  );
}

/**
 * The report's VS block as a replay of the fight: the portraits lunge and recoil, the
 * damage floats up and the life bars drain, beat by beat from the log.
 */
export default function FightStage({ log }: { readonly log: BattleLog }) {
  const timeline = useMemo(() => buildFightTimeline(log), [log]);
  const player = useFightPlayer(timeline);
  const autoPlayId = useId();
  const { beats, fighters } = timeline;
  const beat = beatAt(beats, player.pos);
  const life = lifeAt(timeline, player.pos);
  const shownBeat = beatAt(beats, Math.min(player.pos, beats.length - 1));
  const centre = player.status === 'ready' || beats.length === 0 ? 'VS' : `Round ${shownBeat?.round ?? 1}`;
  const [attacker, defender] = fighters;

  return (
    <div className={styles.stage} style={{ '--fight-speed': player.speed } as React.CSSProperties}>
      <div className={styles.arena}>
        <FighterCard fighter={attacker} image={resolveImage(log.attacker.image)} life={life[attacker.id]} beat={beat} pos={player.pos} lungeClass={styles.lungeRight} />
        <div className={styles.centre}>{centre}</div>
        <FighterCard fighter={defender} image={resolveImage(log.defender.image)} life={life[defender.id]} beat={beat} pos={player.pos} lungeClass={styles.lungeLeft} />
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className="awesome-button"
          onClick={player.status === 'playing' ? player.pause : player.play}
          disabled={beats.length === 0}
        >
          {player.status === 'playing' ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="awesome-button" onClick={player.replay} disabled={beats.length === 0}>Replay</button>
        <button type="button" className="awesome-button" onClick={player.skipToEnd} disabled={player.status === 'finished'}>Skip to end</button>
        <span className={styles.speeds} role="group" aria-label="Speed">
          {REPLAY_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={`awesome-button ${player.speed === speed ? styles.speedActive : ''}`}
              aria-pressed={player.speed === speed}
              onClick={() => player.setSpeed(speed)}
            >
              {speed}×
            </button>
          ))}
        </span>
        <label className={styles.autoPlay} htmlFor={autoPlayId}>
          <input id={autoPlayId} type="checkbox" checked={player.autoPlay} onChange={(event) => player.setAutoPlay(event.target.checked)} />
          Auto-play
        </label>
      </div>
    </div>
  );
}
