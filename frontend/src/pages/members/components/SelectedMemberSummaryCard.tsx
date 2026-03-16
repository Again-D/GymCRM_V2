import { useSelectedMemberStore } from "../modules/SelectedMemberContext";

export function SelectedMemberSummaryCard() {
  const { selectedMember, selectedMemberError, selectedMemberLoading, clearSelectedMember } = useSelectedMemberStore();

  return (
    <aside className="panel-card ops-shell">
      <div className="ops-section__header">
        <div>
          <h2 className="ops-section__title">Focused Member Context</h2>
          <p className="ops-section__subtitle">The currently pinned member follows you into membership and reservation workspaces.</p>
        </div>
        {selectedMember ? (
          <button type="button" className="secondary-button" onClick={clearSelectedMember}>
            Clear Focus
          </button>
        ) : null}
      </div>
      {selectedMemberLoading ? <p className="text-muted">Loading selected member…</p> : null}
      {selectedMemberError ? <p className="error-text">{selectedMemberError}</p> : null}
      {selectedMember ? (
        <>
          <div className="ops-stat-strip">
            <div className="ops-stat-card">
              <span className="ops-stat-card__label">Member ID</span>
              <span className="ops-stat-card__value">#{selectedMember.memberId}</span>
              <span className="ops-stat-card__hint">{selectedMember.memberName}</span>
            </div>
            <div className="ops-stat-card">
              <span className="ops-stat-card__label">Status</span>
              <span className="ops-stat-card__value">{selectedMember.memberStatus}</span>
              <span className="ops-stat-card__hint">{selectedMember.phone}</span>
            </div>
          </div>
          <dl className="selected-member-grid">
          <div>
            <dt>Member</dt>
            <dd>#{selectedMember.memberId} {selectedMember.memberName}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>{selectedMember.phone}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{selectedMember.memberStatus}</dd>
          </div>
          <div>
            <dt>Joined</dt>
            <dd>{selectedMember.joinDate ?? "-"}</dd>
          </div>
          </dl>
        </>
      ) : (
        <div className="ops-empty">
          No member is focused yet. Pick a member from the directory to unlock downstream operations.
        </div>
      )}
    </aside>
  );
}
