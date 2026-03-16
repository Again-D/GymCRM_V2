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
    <section className="members-page-grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) 1fr', gap: '24px', alignItems: 'start' }}>
      
      {/* MAIN CONSOLE */}
      <article className="stack-lg">
        
        {/* MONITORING HEADER */}
        <header className="panel-card">
           <header className="panel-card-header mb-md">
            <div>
              <h1 className="brand-title" style={{ fontSize: '1.25rem' }}>Entry Monitoring</h1>
              <p className="text-muted text-xs">Real-time gate control and member validation.</p>
            </div>
            <div className="row-actions">
              <button
                type="button"
                className="secondary-button"
                style={{ fontSize: '12px' }}
                onClick={() => void reloadAccessData(selectedMemberId)}
                disabled={accessPresenceLoading}
              >
                {accessPresenceLoading ? "Syncing..." : "Manual Sync"}
              </button>
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'ACTIVE NOW', value: accessPresence?.openSessionCount ?? 0, color: 'var(--status-info)' },
              { label: 'TOTAL ENTRY', value: accessPresence?.todayEntryGrantedCount ?? 0, color: 'var(--status-ok)' },
              { label: 'TOTAL EXIT', value: accessPresence?.todayExitCount ?? 0, color: 'var(--text-muted)' },
              { label: 'DENIED', value: accessPresence?.todayEntryDeniedCount ?? 0, color: 'var(--status-danger)' }
            ].map(kpi => (
              <div key={kpi.label} className="panel-card" style={{ padding: '16px', background: 'var(--bg-base)', border: '0' }}>
                <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{kpi.label}</span>
                <div className="text-2xl brand-title mt-xs" style={{ color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        </header>

        {/* SEARCH & SELECTION */}
        <div className="panel-card">
          <header className="panel-card-header mb-md">
            <h2 className="brand-title" style={{ fontSize: '1rem' }}>Gate Controller</h2>
          </header>
          
          <div className="stack-md">
             {!isLiveAccessRoleSupported && (
                <div className="pill danger full-span mb-sm" style={{ justifyContent: 'center', fontWeight: 700 }}>
                  ROLE RESTRICTED: LIVE API DISABLED
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

             <div className="row-actions" style={{ padding: '16px', background: 'var(--bg-surface)', borderRadius: '16px', border: '1.5px solid var(--border-minimal)' }}>
                <div style={{ flex: 1 }}>
                  <span className="text-xs text-muted" style={{ fontWeight: 600 }}>FOCUSED OPERATOR ACTION</span>
                  <div className="text-sm brand-title">
                    {selectedMember ? selectedMember.memberName : "No Member Selected"}
                  </div>
                </div>
                <div className="row-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
                    onClick={() => selectedMemberId && void runAccessAction(() => handleAccessEntry(selectedMemberId))}
                  >
                    GRANT ENTRY
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
                    onClick={() => selectedMemberId && void runAccessAction(() => handleAccessExit(selectedMemberId))}
                  >
                    REGISTER EXIT
                  </button>
                </div>
             </div>

             {(accessPanelMessage || accessPanelError) && (
                <div className="stack-sm">
                  {accessPanelMessage && <div className="pill ok full-span" style={{ justifyContent: 'center' }}>{accessPanelMessage}</div>}
                  {accessPanelError && <div className="pill danger full-span" style={{ justifyContent: 'center' }}>{accessPanelError}</div>}
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
                        <span className="text-sm" style={{ fontWeight: 600 }}>{member.memberName}</span>
                        <span className="text-xs text-muted">ID: {member.memberId} · {member.phone}</span>
                      </div>
                    </td>
                    <td><span className="pill muted">{member.membershipOperationalStatus}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="secondary-button" style={{ padding: '6px 12px', fontSize: '11px' }} onClick={() => void selectMember(member.memberId)}>
                        FOCUS
                      </button>
                    </td>
                  </tr>
                ))}
                {memberResultsPagination.pagedItems.length === 0 && (
                   <tr>
                    <td colSpan={3} className="empty-cell" style={{ padding: '32px' }}>
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
          <header className="mb-md">
            <h2 className="brand-title" style={{ fontSize: '1rem' }}>Active Sessions</h2>
          </header>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th style={{ textAlign: 'right' }}>Entry Time</th>
                </tr>
              </thead>
              <tbody>
                {openSessionsPagination.pagedItems.map((session) => (
                  <tr key={session.accessSessionId}>
                    <td><span className="text-sm" style={{ fontWeight: 600 }}>{session.memberName}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="text-xs text-muted">{formatDateTime(session.entryAt)}</span></td>
                  </tr>
                ))}
                {openSessionsPagination.pagedItems.length === 0 && (
                  <tr><td colSpan={2} className="empty-cell" style={{ padding: '24px' }}>No active visitors.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RECENT EVENTS */}
        <section className="panel-card">
          <header className="mb-md">
            <h2 className="brand-title" style={{ fontSize: '1rem' }}>Access Pulse</h2>
          </header>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th style={{ textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {accessEventsPagination.pagedItems.map((event) => {
                  const label = eventLabel[event.eventType] || { label: event.eventType, class: 'pill muted' };
                  return (
                    <tr key={event.accessEventId}>
                      <td>
                        <div className="stack-sm">
                          <span className="text-sm" style={{ fontWeight: 600 }}>ID: #{event.memberId}</span>
                          <span className="text-xs text-muted">{formatDateTime(event.processedAt)}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={label.class}>{label.label}</span>
                      </td>
                    </tr>
                  );
                })}
                {accessEventsPagination.pagedItems.length === 0 && (
                  <tr><td colSpan={2} className="empty-cell" style={{ padding: '24px' }}>No recent activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </aside>
    </section>
  );
}
