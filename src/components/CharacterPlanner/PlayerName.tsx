import React from 'react';
import styles from './PlayerName.module.css';
import type { CharacterIdentity } from './useCharacterState';

interface PlayerNameProps {
  identity: CharacterIdentity;
  characterLevel: number;
  onGenderChange: (gender: 'male' | 'female') => void;
}

// Map character level to face image level
function getFaceLevel(level: number): number {
  if (level < 10) return 1;
  if (level < 20) return 10;
  if (level < 30) return 20;
  if (level < 40) return 30;
  if (level < 50) return 40;
  if (level < 60) return 50;
  if (level < 70) return 60;
  if (level < 80) return 70;
  return 80;
}

export default function PlayerName({ identity, characterLevel, onGenderChange }: PlayerNameProps) {
  const faceLevel = getFaceLevel(characterLevel);
  const genderSuffix = identity.gender === 'male' ? 'm' : 'f';
  const faceImageUrl = `https://s76-en.gladiatus.gameforge.com/cdn/img/faces/gladiator_${faceLevel}_${genderSuffix}.jpg`;
  
  const isAnimatedCostume = identity.costume?.includes('_complete');

  return (
    <div className={styles.playerNameContainer}>
      <div className="player_name_bg">
        <div className="playername">
          {identity.name}
          {identity.title && (
            <>
              <br />
              {identity.title}
            </>
          )}
        </div>
      </div>
      
      {identity.costume ? (
        <div 
          className={isAnimatedCostume ? styles.costumeAnimation : styles.costumeStatic}
          style={{ backgroundImage: `url(${identity.costume})` }}
          title="Character Costume"
        />
      ) : (
        <>
          <div className={styles.genderSelector}>
            <label className={styles.genderLabel}>
              <input 
                type="radio" 
                name="gender" 
                value="male" 
                checked={identity.gender === 'male'}
                onChange={() => onGenderChange('male')}
              />
              Male
            </label>
            <label className={styles.genderLabel}>
              <input 
                type="radio" 
                name="gender" 
                value="female" 
                checked={identity.gender === 'female'}
                onChange={() => onGenderChange('female')}
              />
              Female
            </label>
          </div>
          <img 
            src={faceImageUrl} 
            alt={`${identity.gender} gladiator face`}
            className={styles.faceImage}
          />
        </>
      )}
    </div>
  );
}
