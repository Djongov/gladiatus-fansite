// Captures full player imports (character, Turma profile, mercenaries) as test references.
// Runs the player parser's Worker handler locally, so nothing goes through the deployed Worker.
// Usage: node scripts/capture-profile-samples.mjs <path-to-gladiatus-player-parser> <profile-url>...
// Output: sample/turma-profiles.json — the parser's JSON per player, with `profile_url` added.
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [parserPath, ...profileUrls] = process.argv.slice(2);
if (!parserPath || profileUrls.length === 0) {
  console.error('Usage: node scripts/capture-profile-samples.mjs <path-to-gladiatus-player-parser> <profile-url>...');
  process.exit(1);
}

const { handleRequest } = await import(pathToFileURL(path.resolve(parserPath, 'worker.js')).href);

const PAUSE_BETWEEN_PLAYERS_MS = 2000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deps = {
  fetch: (url, init) => fetch(url, init),
  cache: { match: async () => undefined, put: async () => {} },
  sleep,
  now: () => Date.now(),
};
const env = { ALLOW_MISSING_ORIGIN: 'true' };
const ctx = { waitUntil: () => {} };

const samples = [];
for (const profileUrl of profileUrls) {
  const request = new Request('http://localhost/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_url: profileUrl }),
  });
  const response = await handleRequest(request, env, ctx, deps);
  const body = await response.json();
  if (!response.ok) {
    console.error(`${profileUrl}: ${response.status} ${body.error ?? ''}`);
  } else {
    samples.push({ profile_url: profileUrl, ...body });
    const slots = [1, 2, 3, 4].map((slot) => body[`mercenary_slot_${slot}`]?.status ?? '-').join(' ');
    console.log(`${body.name} (level ${body.level}): Turma ${body.turma_profile?.status ?? '-'}, mercenaries ${slots}`);
  }
  await sleep(PAUSE_BETWEEN_PLAYERS_MS);
}

const outputPath = path.resolve('sample/turma-profiles.json');
writeFileSync(outputPath, JSON.stringify(samples, null, 1));
console.log(`${samples.length} profiles → ${outputPath}`);
