import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapProfileResponse } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import type { ApiResponse } from '@site/src/components/CharacterPlanner/fetchCharacterProfile';
import samples from '@site/sample/turma-profiles.json';

test('every captured profile maps to a character and a Turma', () => {
  for (const raw of samples as unknown as ApiResponse[]) {
    const profile = mapProfileResponse(raw);
    assert.ok(profile.stats.lifePoints, raw.name);
    assert.ok(profile.turma, raw.name);
  }
});
