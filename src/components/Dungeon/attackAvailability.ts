import { YOUR_TURMA_PROBLEMS, type TurmaTeamResult } from '@site/src/services/combat/turmaTeam';
import type { TeamFighter } from '@site/src/services/combat/teamTypes';

export type AttackAvailability = { enabled: true; fighters: TeamFighter[] } | { enabled: false; reason: string };

/** Whether your Turma team can attack a dungeon enemy, and why not when it can't. */
export function attackAvailability(team: TurmaTeamResult): AttackAvailability {
  if (team.status === 'ok') return { enabled: true, fighters: team.fighters };
  return { enabled: false, reason: YOUR_TURMA_PROBLEMS[team.status] };
}
