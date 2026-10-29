import React, { useState } from 'react';
import Layout from '@theme/Layout';
import ImportProfile from '@site/src/components/CharacterPlanner/ImportProfile';
import { describeProfileFetchError } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import { useActiveCharacter } from '@site/src/hooks/useActiveCharacter';
import TurmaRoster from '@site/src/components/TurmaRoster/TurmaRoster';
import MissingDataNotice from '@site/src/components/MissingDataNotice/MissingDataNotice';
import styles from '@site/src/css/Character.module.css';

function formatRelative(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export default function CharacterPage(): React.ReactElement {
  const { character, login, refresh, logout } = useActiveCharacter();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      await refresh();
    } catch (err) {
      console.error('Refresh error:', err);
      setRefreshError(describeProfileFetchError(err));
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    setRefreshError(null);
    logout();
  };

  return (
    <Layout title="Character" description="Import and persist your Gladiatus character locally">
      <div className={styles.wrapper}>
        {character === null ? (
          <>
            <h1 className={styles.heading}>Load a Character</h1>
            <p className={styles.subtle}>
              Importing your character locally saves your stats and gear in this browser. Nothing
              is uploaded — your data never leaves your device. With a loaded character you get:
            </p>
            <ul className={styles.featureList}>
              <li>Your character name and level shown in the site header.</li>
              <li>The Training Calculator auto-fills your base stats so you only type your target levels.</li>
              <li>The Character Planner auto-loads your build by default.</li>
              <li>
                <strong>Expedition Simulation:</strong> from any expedition page, attack
                any mob with your loaded character — full battle simulation with a
                round-by-round report and rolled rewards.
              </li>
            </ul>
            <ImportProfile onImport={login} />
            <p className={styles.privacyNote}>
              Your character data is stored only in this browser's local storage. We don't send it
              to any server, and clearing your browser data will remove it.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.heading}>Logged in</h1>
            <div className={styles.card}>
              <div className={styles.savedAt}>
                Imported {formatRelative(character.savedAt)}
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  onClick={handleRefresh}
                  disabled={refreshing || !character.profileUrl}
                  title={
                    character.profileUrl
                      ? 'Fetch the latest stats and gear from your Gladiatus profile'
                      : 'Log out and re-import once to enable refresh'
                  }
                >
                  {refreshing ? 'Refreshing…' : 'Refresh profile'}
                </button>
                <button className={styles.button} onClick={handleLogout}>Switch character</button>
                <button className={`${styles.button} ${styles.dangerButton}`} onClick={handleLogout}>
                  Log out
                </button>
              </div>
              {refreshError && <div className={styles.error}>{refreshError}</div>}
            </div>
            <MissingDataNotice entries={character.missingData ?? []} profileUrl={character.profileUrl} />
            <TurmaRoster character={character} />
            <p className={styles.privacyNote}>
              Logged-in state lives only in this browser. Switching browsers or clearing site data
              will log you out.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
