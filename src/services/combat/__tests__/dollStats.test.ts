import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDollStats } from '@site/src/components/CharacterPlanner/dollStats';
import type { DollKind, DollStatsInput } from '@site/src/components/CharacterPlanner/dollStats';
import { mapProfileResponse } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import type { ApiResponse } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import { ATTRIBUTE_KEYS } from '@site/src/components/CharacterPlanner/turmaTypes';
import type { DollStats } from '@site/src/components/CharacterPlanner/turmaTypes';
import { tacticFromRole } from '@site/src/services/combat/turmaRules';
import samples from '@site/sample/turma-profiles.json';

type SampleDoll = { label: string; kind: DollKind; input: DollStatsInput; game: DollStats };

/** Every doll of every captured profile, with what the game reported for it. */
function sampleDolls(): SampleDoll[] {
  const dolls: SampleDoll[] = [];
  for (const raw of samples as unknown as ApiResponse[]) {
    const profile = mapProfileResponse(raw);
    const pacts = profile.pacts ?? new Set();
    dolls.push({
      label: `${raw.name} character`,
      kind: 'character',
      input: { kind: 'character', level: profile.level, baseStats: profile.baseStats, items: profile.items, pacts },
      game: profile.stats,
    });
    const turma = profile.turma;
    if (!turma) continue;
    if (turma.profile.status === 'ok') {
      const doll = turma.profile;
      dolls.push({
        label: `${raw.name} Turma profile`,
        kind: 'turmaProfile',
        input: { kind: 'turmaProfile', level: doll.level, baseStats: doll.baseStats, items: doll.items, pacts, tactic: tacticFromRole(doll.role) },
        game: doll.stats,
      });
    }
    turma.mercenaries.forEach((doll, index) => {
      if (doll.status !== 'ok' || !doll.contract) return;
      dolls.push({
        label: `${raw.name} mercenary ${index + 1} (${doll.contract.name} ${doll.contract.rarity})`,
        kind: 'mercenary',
        input: {
          kind: 'mercenary',
          level: doll.level,
          baseStats: doll.baseStats,
          items: doll.items,
          pacts: new Set(),
          tactic: tacticFromRole(doll.role),
          contractLifePoints: doll.contract.lifePoints ?? undefined,
        },
        game: doll.stats,
      });
    });
  }
  return dolls;
}

const SCALAR_FIELDS = ['lifePoints', 'armour', 'damageMin', 'damageMax', 'healing', 'threat'] as const;

const CONDITIONING = 'the import cannot tell which items are conditioned; flipping the listed items makes it exact';
const COSTUME_15 = 'account-wide effect on costume-15 accounts: ~1.4% more healing, threat 0.71 × Charisma, small life/damage gains';
const TEMPORARY_BUFF = 'more damage than the gear explains; most likely a temporary buff (oil), which the planner does not model';
const UNEXPLAINED = 'unexplained; see Open Questions on the Missing Data page';

/** Dolls the planner can't reproduce from gear alone, and why. A doll that starts matching must leave this list. */
const KNOWN_GAPS: Record<string, string> = {
  'Maccabi_TelAviv mercenary 2 (Samnit orange)': `${CONDITIONING} (amulet)`,
  'GODKICK Turma profile': `${CONDITIONING} (weapon, shield, shoes)`,
  'PINCHARRATA Turma profile': `${CONDITIONING} (shoes)`,
  '+Lucifer+ character': COSTUME_15,
  '+Lucifer+ Turma profile': `${COSTUME_15}; ${CONDITIONING}`,
  '+Lucifer+ mercenary 1 (Samnit red)': COSTUME_15,
  '+Lucifer+ mercenary 2 (Maccabi_TelAviv red)': COSTUME_15,
  '+Lucifer+ mercenary 3 (Samnit orange)': COSTUME_15,
  '+Lucifer+ mercenary 4 (Grandmaster orange)': COSTUME_15,
  'Flatrows character': COSTUME_15,
  'Flatrows Turma profile': COSTUME_15,
  'Flatrows mercenary 1 (Murmillo purple)': COSTUME_15,
  'Flatrows mercenary 2 (Samnit orange)': COSTUME_15,
  'Flatrows mercenary 3 (Grandmaster orange)': COSTUME_15,
  'Flatrows mercenary 4 (Samnit purple)': COSTUME_15,
  '-Durham- character': TEMPORARY_BUFF,
  '-Durham- Turma profile': TEMPORARY_BUFF,
  'Aveloca character': TEMPORARY_BUFF,
  'Klaus. character': `${TEMPORARY_BUFF}; armour too`,
  'GODKICK mercenary 4 (Druid Master blue)': `${UNEXPLAINED} (weapon Strength % counts about half)`,
  'PINCHARRATA mercenary 4 (Medicine man blue)': `${UNEXPLAINED} (weapon Strength % counts about half)`,
  'PINCHARRATA mercenary 1 (Samnit green)': `${UNEXPLAINED} (Intelligence 2 high)`,
  'PINCHARRATA mercenary 3 (Samnit green)': `${UNEXPLAINED} (Intelligence 2 high)`,
  'AKKILES mercenary 2 (Samnit orange)': `${UNEXPLAINED} (armour, healing)`,
};

test('every captured doll is reproduced exactly, apart from the known gaps', () => {
  const mismatches: string[] = [];
  const stillMismatching = new Set<string>();
  for (const { label, input, game } of sampleDolls()) {
    const before = mismatches.length;
    const calculated = calculateDollStats(input);
    for (const field of SCALAR_FIELDS) {
      if (calculated[field] !== game[field]) mismatches.push(`${label} ${field}: ${calculated[field]} ≠ game ${game[field]}`);
    }
    for (const key of ATTRIBUTE_KEYS) {
      for (const part of ['total', 'max'] as const) {
        const ours = calculated.attributes?.[key][part];
        const theirs = game.attributes?.[key][part];
        if (ours !== theirs) mismatches.push(`${label} ${key}.${part}: ${ours} ≠ game ${theirs}`);
      }
    }
    if (label in KNOWN_GAPS && mismatches.length > before) {
      stillMismatching.add(label);
      mismatches.length = before;
    }
  }
  assert.deepEqual(mismatches, []);
  assert.deepEqual([...stillMismatching].sort(), Object.keys(KNOWN_GAPS).sort(), 'a known gap now matches: remove it from KNOWN_GAPS');
});

test('a mercenary’s life is its contract life plus 15 per item Constitution plus item health', () => {
  const godkick = sampleDolls().find((doll) => doll.label === 'GODKICK mercenary 2 (Axe Thrower orange)');
  assert.ok(godkick);
  // Contract 9165, items add 86 Constitution and no health
  assert.equal(calculateDollStats(godkick.input).lifePoints, 10455);
});
