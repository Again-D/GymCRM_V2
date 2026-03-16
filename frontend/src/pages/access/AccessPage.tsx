import { useEffect, useState } from "react";

import { useAuthState } from "../../app/auth";
import { formatDate } from "../../shared/format";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useMembersQuery } from "../members/modules/useMembersQuery";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { MemberSummary } from "../members/modules/types";
import { useAccessPrototypeState } from "./modules/useAccessPrototypeState";
import { useAccessQueries } from "./modules/useAccessQueries";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

const eventLabel: Record<string, { label: string; class: string }> = {
  ENTRY_GRANTED: { label: "GRANTED", class: "pill ok" },
  EXIT: { label: "EXIT", class: "pill muted" },
  ENTRY_DENIED: { label: "DENIED", class: "pill danger" }
};

export default function AccessPage() {
  const { authUser, isMockMode } = useAuthState();
  const { selectedMember, selectedMemberId, selectMember } = useSelectedMemberStore();
  const [accessMemberQuery, setAccessMemberQuery] = useState("");
  const debouncedAccessMemberQuery = useDebouncedValue(accessMemberQuery, 250);
  
  const {
    members,
    loadMembers,
    resetMembersQuery
  } = useMembersQuery({
    getDefaultFilters: () => ({
      name: accessMemberQuery,
      phone: accessMemberQuery,
      membershipOperationalStatus: "",
      dateFrom: "",
      dateTo: ""
    })
  });
  
  const {
    accessEvents,
    accessPresence,
    accessPresenceLoading,
    accessQueryError,
    loadAccessEvents,
    loadAccessPresence,
    reloadAccessData,
    resetAccessQueries
  } = useAccessQueries();
  
  const {
    accessActionSubmitting,
    accessPanelMessage,
    accessPanelError,
    handleAccessEntry,
    handleAccessExit
  } = useAccessPrototypeState();

  const isLiveAccessRoleSupported =
    isMockMode || authUser?.role === "ROLE_CENTER_ADMIN" || authUser?.role === "ROLE_DESK";

  const memberResultsPagination = usePagination(members, {
    initialPageSize: 10,
    resetDeps: [accessMemberQuery, members.length]
  });
  const openSessionsPagination = usePagination(accessPresence?.openSessions ?? [], {
    initialPageSize: 10,
    resetDeps: [accessPresence?.openSessions.length ?? 0]
  });
  const accessEventsPagination = usePagination(accessEvents, {
    initialPageSize: 10,
    resetDeps: [selectedMemberId, accessEvents.length]
  });

  useEffect(() => {
    if (!isLiveAccessRoleSupported) {
      resetMembersQuery();
      return;
    }
  }, [isLiveAccessRoleSupported, resetMembersQuery]);

  useEffect(() => {
    if (!isLiveAccessRoleSupported) return;
    void loadMembers({ name: debouncedAccessMemberQuery, phone: debouncedAccessMemberQuery });
  }, [debouncedAccessMemberQuery, isLiveAccessRoleSupported, loadMembers]);

  useEffect(() => {
    if (!isLiveAccessRoleSupported) {
      resetAccessQueries();
      return;
    }
    void loadAccessPresence();
    void loadAccessEvents(selectedMemberId);
    return () => {
      resetAccessQueries();
    };
  }, [isLiveAccessRoleSupported, loadAccessEvents, loadAccessPresence, resetAccessQueries, selectedMemberId]);

  async function runAccessAction(action: () => Promise<boolean>) {
    await action();
    await reloadAccessData(selectedMemberId);
  }

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">Gate Control</span>
          <h1 className="ops-title">Entry Monitoring</h1>
          <p className="ops-subtitle">Validate members, track live entry status, and operate the reception gate from one high-clarity console.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">Live gate pulse</span>
            <span className="ops-meta__pill">Focused operator actions</span>
            <span className="ops-meta__pill">Member-linked access history</span>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button ops-action-button"
          onClick={() => void reloadAccessData(selectedMemberId)}
          disabled={accessPresenceLoading}
        >
          {accessPresenceLoading ? "Syncing..." : "Manual Sync"}
        </button>
      </div>

      <div className="ops-kpi-grid">
        {[
          { label: "Active Now", value: accessPresence?.openSessionCount ?? 0, hint: "Members currently inside the club" },
          { label: "Total Entry", value: accessPresence?.todayEntryGrantedCount ?? 0, hint: "Approved entries for the business day" },
          { label: "Total Exit", value: accessPresence?.todayExitCount ?? 0, hint: "Registered exits recorded today" },
          { label: "Denied", value: accessPresence?.todayEntryDeniedCount ?? 0, hint: "Blocked attempts that need review" }
        ].map((kpi) => (
          <div key={kpi.label} className="ops-kpi-card">
            <span className="ops-kpi-card__label">{kpi.label}</span>
            <span className="ops-kpi-card__value">{kpi.value}</span>
            <span className="ops-kpi-card__hint">{kpi.hint}</span>
          </div>
        ))}
      </div>

      <section className="ops-surface-grid ops-surface-grid--wide-main">
        <article className="stack-lg">

        {/* SEARCH & SELECTION */}
        <div className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">Gate Controller</h2>
              <p className="ops-section__subtitle">Search members, pin the active subject, and execute entry or exit commands.</p>
            </div>
          </div>
          
          <div className="stack-md">
             {!isLiveAccessRoleSupported && (
                <div className="field-ops-note field-ops-note--restricted">
                  <span className="field-ops-note__label">Restricted live mode</span>
                  <div className="text-sm brand-title mt-xs">ROLE RESTRICTED: LIVE API DISABLED</div>
                  <div className="mt-xs text-sm">This role can view the workspace shell, but live access API actions stay disabled.</div>
                </div>
             )}

             <div className="context-fallback-toolbar">
                <input
                  className="input"
                  value={accessMemberQuery}
                  onChange={(event) => setAccessMemberQuery(event.target.value)}
                  placeholder="Scan Member ID or Search Name..."
                  disabled={!isLiveAccessRoleSupported}
                />
             </div>

             <SelectedMemberContextBadge />

             <div className="ops-focus-card">
                <div className="ops-focus-card__copy">
                  <span className="ops-focus-card__eyebrow">Focused operator action</span>
                  <div className="ops-focus-card__title">
                    {selectedMember ? selectedMember.memberName : "No Member Selected"}
                  </div>
                </div>
                <div className="ops-table-actions">
                  <button
                    type="button"
                    className="primary-button ops-action-button"
                    disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
                    onClick={() => selectedMemberId && void runAccessAction(() => handleAccessEntry(selectedMemberId))}
                  >
                    GRANT ENTRY
                  </button>
                  <button
                    type="button"
                    className="secondary-button ops-action-button"
                    disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
                    onClick={() => selectedMemberId && void runAccessAction(() => handleAccessExit(selectedMemberId))}
                  >
                    REGISTER EXIT
                  </button>
                </div>
             </div>

             {(accessPanelMessage || accessPanelError) && (
                <div className="ops-feedback-stack">
                  {accessPanelMessage && <div className="pill ok full-span">{accessPanelMessage}</div>}
                  {accessPanelError && <div className="pill danger full-span">{accessPanelError}</div>}
                </div>
             )}
          </div>

          <div className="table-shell mt-lg">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {memberResultsPagination.pagedItems.map((member: MemberSummary) => (
                  <tr key={member.memberId} className={member.memberId === selectedMemberId ? "is-selected-row" : undefined}>
                    <td>
                      <div className="stack-sm">
                        <span className="text-sm brand-title">{member.memberName}</span>
                        <span className="text-xs text-muted">ID: {member.memberId} · {member.phone}</span>
                      </div>
                    </td>
                    <td><span className="pill muted">{member.membershipOperationalStatus}</span></td>
                    <td className="ops-right">
                      <button type="button" className="secondary-button ops-action-button" onClick={() => void selectMember(member.memberId)}>
                        FOCUS
                      </button>
                    </td>
                  </tr>
                ))}
                {memberResultsPagination.pagedItems.length === 0 && (
                   <tr>
                    <td colSpan={3} className="empty-cell">
                      {!isLiveAccessRoleSupported ? "Access Control Restricted for this Role." : "Awaiting valid search input..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-md">
            <PaginationControls {...memberResultsPagination} pageSizeOptions={[10, 20]} onPageChange={memberResultsPagination.setPage} onPageSizeChange={memberResultsPagination.setPageSize} />
          </div>
        </div>
      </article>

      {/* SIDEBAR: ACTIVITY PULSE */}
      <aside className="stack-lg">
        
        {/* CURRENT VISITS */}
        <section className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">Active Sessions</h2>
              <p className="ops-section__subtitle">Members currently inside the facility.</p>
            </div>
          </div>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="ops-right">Entry Time</th>
                </tr>
              </thead>
              <tbody>
                {openSessionsPagination.pagedItems.map((session) => (
                  <tr key={session.accessSessionId}>
                    <td><span className="text-sm brand-title">{session.memberName}</span></td>
                    <td className="ops-right"><span className="text-xs text-muted">{formatDateTime(session.entryAt)}</span></td>
                  </tr>
                ))}
                {openSessionsPagination.pagedItems.length === 0 && (
                  <tr><td colSpan={2} className="empty-cell">No active visitors.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RECENT EVENTS */}
        <section className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">Access Pulse</h2>
              <p className="ops-section__subtitle">Latest grant, exit, and denial events for the focused context.</p>
            </div>
          </div>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th className="ops-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {accessEventsPagination.pagedItems.map((event) => {
                  const label = eventLabel[event.eventType] || { label: event.eventType, class: 'pill muted' };
                  return (
                    <tr key={event.accessEventId}>
                      <td>
                        <div className="stack-sm">
                          <span className="text-sm brand-title">ID: #{event.memberId}</span>
                          <span className="text-xs text-muted">{formatDateTime(event.processedAt)}</span>
                        </div>
                      </td>
                      <td className="ops-right">
                        <span className={label.class}>{label.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {accessEventsPagination.pagedItems.length === 0 && (
                  <tr><td colSpan={2} className="empty-cell">No recent activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </aside>
    </section>
    </section>
  );
}
