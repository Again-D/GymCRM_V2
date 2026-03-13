import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

export function SelectedMemberContextBadge() {
  const { selectedMember } = useSelectedMemberStore();

  return (
    <div className="selected-member-context-badge">
      <strong>선택된 회원</strong>
      <span>{selectedMember ? `#${selectedMember.memberId} ${selectedMember.memberName}` : "선택된 회원 없음"}</span>
    </div>
  );
}
