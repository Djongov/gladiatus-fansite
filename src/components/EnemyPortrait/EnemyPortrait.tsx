import React from 'react';
import styles from './EnemyPortrait.module.css';

export const IMAGE_CDN_PREFIX = 'https://gladiatusfansite.blob.core.windows.net/images/';
const BOSS_FRAME_URL = `${IMAGE_CDN_PREFIX}Expeditions/boss_picture.png`;

/** An NPC's portrait (CDN-relative `image`), framed like the game when it's a boss. */
export default function EnemyPortrait({ name, image, isBoss }: { readonly name: string; readonly image: string; readonly isBoss: boolean }) {
  const portrait = <img src={`${IMAGE_CDN_PREFIX}${image}`} alt={name} title={name} className={styles.enemyImage} />;
  if (!isBoss) return portrait;
  return (
    <div className={styles.bossImageWrap}>
      {portrait}
      <img src={BOSS_FRAME_URL} alt="Boss" className={styles.bossFrame} />
    </div>
  );
}
