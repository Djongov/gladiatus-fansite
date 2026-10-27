/** Pure helpers that shape a TeamBattleLog the way the game's Turma report shows it. */
import type { FighterSnapshot, SwingEvent, TeamFighter } from '@site/src/services/combat/teamTypes';

export type LifeRow = {
  /** The fighter's id (labels repeat: three mercenaries can all be "Samnit") */
  id: string;
  label: string;
  life: number;
  maxLife: number;
  /** Life change since the previous round */
  change: number;
  /** Share of the team's threat, % */
  threatPercent: number;
};

export type TeamMark = '¹' | '²' | null;

/**
 * The marks that tell the teams' mercenaries apart (¹ attackers, ² defenders). Only a
 * fight with mercenaries on both sides needs them: dungeon reports show plain "Samnit".
 */
export function teamMarks(attackers: TeamFighter[], defenders: TeamFighter[]): { attacker: TeamMark; defender: TeamMark } {
  const hasMercenaries = (team: TeamFighter[]) => team.some((fighter) => fighter.kind === 'mercenary');
  const both = hasMercenaries(attackers) && hasMercenaries(defenders);
  return { attacker: both ? '¹' : null, defender: both ? '²' : null };
}

/**
 * One life-panel row per fighter, mercenaries sharing a name included (the game pools
 * those into "Samnit ×3"; we keep each one visible). Mercenaries carry the team mark,
 * if any; players don't.
 */
export function lifeRows(
  fighters: TeamFighter[],
  snapshot: Record<string, FighterSnapshot>,
  previous: Record<string, FighterSnapshot>,
  teamMark: TeamMark,
): LifeRow[] {
  const teamThreat = fighters.reduce((sum, fighter) => sum + snapshot[fighter.id].threat, 0);
  return fighters.map((fighter) => {
    const { life, threat } = snapshot[fighter.id];
    return {
      id: fighter.id,
      label: fighter.kind === 'mercenary' ? fighter.name + (teamMark ?? '') : fighter.name,
      life,
      maxLife: fighter.maxLife,
      change: life - previous[fighter.id].life,
      threatPercent: teamThreat > 0 ? Math.round((threat / teamThreat) * 100) : 0,
    };
  });
}

/** `isDamage`: shown in the damage colours (red, or grey when blocked); otherwise in plain text. */
export type ResultLine = { text: string; emphasis: boolean; isDamage: boolean };

/**
 * The result lines under "X hits Y." — crits are emphasised (bold, *…*) in the report.
 * A shielded target shows what the shield soaked, "*Shield removed*" when the blow
 * breaks it, and then any damage that went through.
 */
export function swingLine(swing: SwingEvent, targetName: string): ResultLine[] {
  if (!swing.landed) return [{ text: 'missed', emphasis: false, isDamage: false }];
  if (swing.shieldAbsorbed > 0) {
    const lines = [{ text: `${targetName} absorbs ${swing.shieldAbsorbed} damage`, emphasis: swing.isCrit, isDamage: false }];
    if (swing.shieldBroken) lines.push({ text: 'Shield removed', emphasis: true, isDamage: false });
    if (swing.damage > 0) lines.push({ text: `${targetName} receives ${swing.damage} damage`, emphasis: swing.isCrit, isDamage: true });
    return lines;
  }
  if (swing.damage === 0 && swing.isBlocked) return [{ text: 'blocked', emphasis: false, isDamage: true }];
  return [{ text: `${targetName} receives ${swing.damage} damage`, emphasis: swing.isCrit, isDamage: true }];
}
