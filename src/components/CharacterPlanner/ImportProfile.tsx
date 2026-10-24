import React, { useState } from 'react';
import styles from './ImportProfile.module.css';
import type { ItemSlotType, BaseStats, EquippedItem, CharacterIdentity } from './useCharacterState';
import type { PactId } from './PactDefinitions';
import { fetchCharacterProfile, describeProfileFetchError } from './fetchCharacterProfile';

interface ImportProfileProps {
  onImport: (
    level: number,
    baseStats: BaseStats,
    items: Map<ItemSlotType, EquippedItem>,
    identity: CharacterIdentity,
    pacts: Set<PactId> | undefined,
    profileUrl: string,
  ) => void;
}

export default function ImportProfile({ onImport }: ImportProfileProps) {
  const [profileUrl, setProfileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImport = async () => {
    const trimmedUrl = profileUrl.trim();
    if (!trimmedUrl) {
      setError('Please enter a profile URL');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const profile = await fetchCharacterProfile(trimmedUrl);
      onImport(profile.level, profile.baseStats, profile.items, profile.identity, profile.pacts, trimmedUrl);

      setSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Import error:', err);
      setError(describeProfileFetchError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.importContainer}>
      <h3 className={styles.title}>Import Profile</h3>
      <div className={styles.inputGroup}>
        <input
          type="text"
          className={styles.input}
          placeholder="Enter Gladiatus profile URL"
          value={profileUrl}
          onChange={(e) => setProfileUrl(e.target.value)}
          disabled={loading}
        />
        <button
          className={styles.button}
          onClick={handleImport}
          disabled={loading || !profileUrl.trim()}
        >
          {loading ? 'Importing...' : 'Import'}
        </button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>Profile imported successfully!</div>}
      <div className={styles.note}>
        Enter the URL of a Gladiatus character profile to automatically import their stats and equipment.
      </div>
    </div>
  );
}
