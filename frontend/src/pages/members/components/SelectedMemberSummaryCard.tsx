import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

export function SelectedMemberSummaryCard() {
  const { selectedMember, selectedMemberError, selectedMemberLoading, clearSelectedMember } = useSelectedMemberStore();

  return (
    <aside className="selected-member-card">
      <div className="selected-member-card-header">
        <h2>선택된 회원 컨텍스트</h2>
        {selectedMember ? (
          <button type="button" className="secondary-button" onClick={clearSelectedMember}>
            선택 해제
          </button>
        ) : null}
      </div>
      {selectedMemberLoading ? <p>회원 정보를 불러오는 중...</p> : null}
      {selectedMemberError ? <p className="error-text">{selectedMemberError}</p> : null}
      {selectedMember ? (
        <dl className="selected-member-grid">
          <div>
            <dt>회원</dt>
            <dd>#{selectedMember.memberId} {selectedMember.memberName}</dd>
          </div>
          <div>
            <dt>연락처</dt>
            <dd>{selectedMember.phone}</dd>
          </div>
          <div>
            <dt>상태</dt>
            <dd>{selectedMember.memberStatus}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{selectedMember.joinDate ?? "-"}</dd>
          </div>
        </dl>
      ) : (
        <p>members 도메인 support module/store가 선택된 회원 컨텍스트를 소유합니다. 아직 회원이 선택되지 않았습니다.</p>
      )}
    </aside>
  );
}
