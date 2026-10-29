import React, { useState } from 'react';
import { SLOT_LABELS } from '@site/src/components/CharacterPlanner/CharacterDoll';
import type { MissingDataEntry } from '@site/src/components/CharacterPlanner/turmaTypes';
import styles from './MissingDataNotice.module.css';

const GITHUB_NEW_ISSUE_URL = 'https://github.com/Djongov/gladiatus-fansite/issues/new';
const REPORT_EMAIL = 'djongov@gamerz-bg.com';
const DISCORD_USERNAME = 'Skarsburning';

/** "https://s80-en.gladiatus.gameforge.com/..." → "s80-en", so the maintainer knows which server to look at */
function serverFromProfileUrl(profileUrl?: string): string {
  if (!profileUrl) return 'unknown server';
  try {
    return new URL(profileUrl).hostname.split('.')[0];
  } catch {
    return 'unknown server';
  }
}

function groupByDoll(entries: MissingDataEntry[]): Array<[string, MissingDataEntry[]]> {
  const groups = new Map<string, MissingDataEntry[]>();
  for (const entry of entries) {
    groups.set(entry.doll, [...(groups.get(entry.doll) ?? []), entry]);
  }
  return [...groups.entries()];
}

function reportTitle(entries: MissingDataEntry[], server: string): string {
  return `Missing item data: ${entries.length} id${entries.length === 1 ? '' : 's'} (${server})`;
}

/** Markdown table: renders as a table in GitHub issues and stays readable as plain text in email/Discord */
function reportBody(entries: MissingDataEntry[], server: string): string {
  const rows = entries.map(
    (entry) =>
      `| ${entry.doll} | ${SLOT_LABELS[entry.slot]} | ${entry.kind} | ${entry.id} | ${entry.itemName} | ${entry.level} | ${entry.rarity} |`
  );
  return [
    `Found by the profile import on /character, server ${server}.`,
    '',
    '| Doll | Slot | Missing | Id | Item | Level | Rarity |',
    '|---|---|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

/** Tells the player which ids on their gear our item data lacks, and offers three ways to report them. */
export default function MissingDataNotice({
  entries,
  profileUrl,
}: {
  readonly entries: MissingDataEntry[];
  readonly profileUrl?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (entries.length === 0) return null;

  const server = serverFromProfileUrl(profileUrl);
  const title = reportTitle(entries, server);
  const body = reportBody(entries, server);
  const githubUrl = `${GITHUB_NEW_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  const mailtoUrl = `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Copying the report failed:', err);
    }
  };

  return (
    <div className={`alert alert--warning ${styles.notice}`} role="status">
      <strong>
        {entries.length} {entries.length === 1 ? 'id' : 'ids'} on your gear {entries.length === 1 ? "isn't" : "aren't"} in
        our database yet.
      </strong>{' '}
      Report {entries.length === 1 ? 'it' : 'them'} and help complete the item data for everyone.
      {groupByDoll(entries).map(([doll, dollEntries]) => (
        <div key={doll} className={styles.doll}>
          <div className={styles.dollName}>{doll}</div>
          <ul className={styles.list}>
            {dollEntries.map((entry) => (
              <li key={`${entry.slot}-${entry.kind}-${entry.id}`}>
                <strong>{SLOT_LABELS[entry.slot]}:</strong> {entry.kind} id <code>{entry.id}</code> isn't in our
                database — "{entry.itemName}" (level {entry.level}, {entry.rarity})
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className={styles.actions}>
        <a className="button button--sm button--primary" href={githubUrl} target="_blank" rel="noopener noreferrer">
          Open a GitHub issue
        </a>
        <a className="button button--sm button--secondary" href={mailtoUrl}>
          Email {REPORT_EMAIL}
        </a>
        <button type="button" className="button button--sm button--secondary" onClick={copyReport}>
          {copied ? 'Copied!' : 'Copy report for Discord'}
        </button>
        <span className={styles.discordHint}>
          then send it to <strong>{DISCORD_USERNAME}</strong> on Discord
        </span>
      </div>
    </div>
  );
}
