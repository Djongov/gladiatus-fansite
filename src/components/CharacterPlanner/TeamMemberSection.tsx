import React, { useState } from 'react';
import CharacterDoll from './CharacterDoll';
import ItemSelector from './ItemSelector';
import ContractEditor from './ContractEditor';
import CharStatsPanel from '../TurmaRoster/CharStatsPanel';
import { calculateCharacterStats } from './useCharacterState';
import type { EquippedItem, ItemSlotType } from './useCharacterState';
import { ROLE_BY_TACTIC, contractAffixesUnknown } from './useTeamState';
import type { MemberDoll, MemberRef, MercenaryMember, Role, TeamAction, TeamMember } from './useTeamState';
import styles from './TeamMemberSection.module.css';

const ROLE_OPTIONS: { role: Role; label: string }[] = [
  { role: ROLE_BY_TACTIC.tank, label: 'Tank' },
  { role: ROLE_BY_TACTIC.healer, label: 'Healer' },
  { role: ROLE_BY_TACTIC.damage, label: 'Damage dealer' },
];

/** One Turma profile or mercenary section of the planner: role, contract (mercenaries), gear doll and stats. */
export default function TeamMemberSection({ title, memberRef, member, doll, strictItemLevel, dispatch }: Readonly<{
  title: string;
  memberRef: MemberRef;
  member: TeamMember | MercenaryMember;
  /** Null for a mercenary slot without a contract */
  doll: MemberDoll | null;
  strictItemLevel: boolean;
  dispatch: (action: TeamAction) => void;
}>) {
  const [selectedSlot, setSelectedSlot] = useState<ItemSlotType | null>(null);
  const setItem = (slot: ItemSlotType, item: EquippedItem | null) => dispatch({ type: 'setItem', member: memberRef, slot, item });
  const isMercenary = memberRef !== 'turmaProfile';

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <h3>{title}</h3>
        {doll && (
          <label className={styles.field}>
            Role
            <select
              value={member.role ?? ''}
              onChange={(event) => dispatch({ type: 'setRole', member: memberRef, role: event.target.value as Role })}
            >
              {!member.role && <option value="">Choose…</option>}
              {ROLE_OPTIONS.map(({ role, label }) => <option key={role} value={role}>{label}</option>)}
            </select>
          </label>
        )}
      </div>
      {member.status === 'locked' && (
        <p className={styles.note}>Not unlocked on your account yet — planned only.</p>
      )}

      {isMercenary && contractAffixesUnknown(member as MercenaryMember) && (
        <p className={styles.note}>
          This contract was imported before its hidden prefix and suffix were kept. Re-import your profile on /character
          to see them; until then its level and stats stay as imported.
        </p>
      )}
      {isMercenary && (
        <ContractEditor
          contract={(member as MercenaryMember).contract}
          calculated={doll?.contract ?? null}
          onChange={(contract) => dispatch({ type: 'setContract', mercenary: memberRef, contract })}
        />
      )}

      {doll && (
        <div className={styles.body}>
          <CharacterDoll
            equippedItems={member.items}
            onSlotClick={setSelectedSlot}
            onSlotRemove={(slot) => setItem(slot, null)}
            characterLevel={doll.level}
            characterBaseStats={doll.baseStats}
          />
          <CharStatsPanel
            level={doll.level}
            stats={doll.stats}
            derived={calculateCharacterStats(member.items, doll.level, doll.baseStats, doll.pacts)}
          />
        </div>
      )}

      {doll && selectedSlot && (
        <ItemSelector
          slotType={selectedSlot}
          characterLevel={doll.level}
          currentItem={member.items.get(selectedSlot) ?? null}
          onSelect={(item) => setItem(selectedSlot, item)}
          onClose={() => setSelectedSlot(null)}
          strictItemLevel={strictItemLevel}
        />
      )}
    </section>
  );
}
