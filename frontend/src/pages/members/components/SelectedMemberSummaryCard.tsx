import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

export function SelectedMemberSummaryCard() {
  const { selectedMember, selectedMemberError, selectedMemberLoading, clearSelectedMember } = useSelectedMemberStore();

  const statusLabel = selectedMember?.memberStatus === "ACTIVE" ? "활성" : "비활성";

  return (
    <aside className="panel-card ops-shell">
      <div className="ops-section__header">
        <div>
          <h2 className="ops-section__title">선택된 회원 정보</h2>
          <p className="ops-section__subtitle">선택된 회원 정보는 회원권 및 예약 관리 화면에서도 계속 유지됩니다.</p>
        </div>
        {selectedMember ? (
          <button type="button" className="secondary-button" onClick={clearSelectedMember}>
            선택 해제
          </button>
        ) : null}
      </div>
      {selectedMemberLoading ? <p className="text-muted">회원 정보를 불러오는 중...</p> : null}
      {selectedMemberError ? <p className="error-text">{selectedMemberError}</p> : null}
      {selectedMember ? (
        <>
          <div className="ops-stat-strip">
            <div className="ops-stat-card">
              <span className="ops-stat-card__label">회원 번호</span>
              <span className="ops-stat-card__value">#{selectedMember.memberId}</span>
              <span className="ops-stat-card__hint">{selectedMember.memberName}</span>
            </div>
            <div className="ops-stat-card">
              <span className="ops-stat-card__label">상세 상태</span>
              <span className="ops-stat-card__value">{statusLabel}</span>
              <span className="ops-stat-card__hint">{selectedMember.phone}</span>
            </div>
          </div>
          <dl className="selected-member-grid">
          <div>
            <dt>회원명</dt>
            <dd>#{selectedMember.memberId} {selectedMember.memberName}</dd>
          </div>
          <div>
            <dt>연락처</dt>
            <dd>{selectedMember.phone}</dd>
          </div>
          <div>
            <dt>회원권 상태</dt>
            <dd>{statusLabel}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{selectedMember.joinDate ?? "-"}</dd>
          </div>
          </dl>
        </>
      ) : (
        <div className="ops-empty">
          선택된 회원이 없습니다. 명단에서 회원을 선택하여 업무를 시작하세요.
        </div>
      )}
    </aside>
  );
}
