import { useEffect, useState } from "react";

import { useAuthState } from "../../app/auth";
import { formatDate } from "../../shared/format";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";

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
  ENTRY_GRANTED: { label: "입장 승인", class: "pill ok" },
  EXIT: { label: "퇴장", class: "pill muted" },
  ENTRY_DENIED: { label: "입장 거부", class: "pill danger" }
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
          <span className="ops-eyebrow">출입 제어</span>
          <h1 className="ops-title">출입 모니터링</h1>
          <p className="ops-subtitle">회원 상태를 확인하고 현재 입장 현황을 추적하며 리셉션 출입 처리를 한 화면에서 수행합니다.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">실시간 출입 현황</span>
            <span className="ops-meta__pill">선택 회원 액션</span>
            <span className="ops-meta__pill">회원 연동 이력</span>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button ops-action-button"
          onClick={() => void reloadAccessData(selectedMemberId)}
          disabled={accessPresenceLoading}
        >
          {accessPresenceLoading ? "동기화 중..." : "수동 동기화"}
        </button>
      </div>

      <div className="ops-kpi-grid">
        {[
          { label: "현재 입장", value: accessPresence?.openSessionCount ?? 0, hint: "현재 센터 내부에 있는 회원 수" },
          { label: "오늘 입장", value: accessPresence?.todayEntryGrantedCount ?? 0, hint: "영업일 기준 승인된 입장 수" },
          { label: "오늘 퇴장", value: accessPresence?.todayExitCount ?? 0, hint: "오늘 기록된 퇴장 수" },
          { label: "거부 건수", value: accessPresence?.todayEntryDeniedCount ?? 0, hint: "추가 확인이 필요한 거부 건수" }
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
              <h2 className="ops-section__title">출입 제어 패널</h2>
              <p className="ops-section__subtitle">회원을 검색하고 선택한 뒤 입장 또는 퇴장 처리를 실행합니다.</p>
            </div>
          </div>
          
          <div className="stack-md">
             {!isLiveAccessRoleSupported && (
                <div className="field-ops-note field-ops-note--restricted">
                  <span className="field-ops-note__label">라이브 제한</span>
                  <div className="text-sm brand-title mt-xs">현재 권한에서는 실시간 출입 API를 사용할 수 없습니다.</div>
                  <div className="mt-xs text-sm">화면은 볼 수 있지만 실제 출입 처리 액션은 비활성화됩니다.</div>
                </div>
             )}

             <div className="context-fallback-toolbar">
                <input
                  className="input"
                  value={accessMemberQuery}
                  onChange={(event) => setAccessMemberQuery(event.target.value)}
                  placeholder="회원 ID 스캔 또는 이름 검색"
                  disabled={!isLiveAccessRoleSupported}
                />
             </div>



             <div className="ops-focus-card">
                <div className="ops-focus-card__copy">
                  <span className="ops-focus-card__eyebrow">선택 회원 처리</span>
                  <div className="ops-focus-card__title">
                    {selectedMember ? selectedMember.memberName : "선택된 회원 없음"}
                  </div>
                </div>
                <div className="ops-table-actions">
                  <button
                    type="button"
                    className="primary-button ops-action-button"
                    disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
                    onClick={() => selectedMemberId && void runAccessAction(() => handleAccessEntry(selectedMemberId))}
                  >
                    입장 처리
                  </button>
                  <button
                    type="button"
                    className="secondary-button ops-action-button"
                    disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
                    onClick={() => selectedMemberId && void runAccessAction(() => handleAccessExit(selectedMemberId))}
                  >
                    퇴장 처리
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
                  <th>회원 정보</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>액션</th>
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
                        선택
                      </button>
                    </td>
                  </tr>
                ))}
                {memberResultsPagination.pagedItems.length === 0 && (
                   <tr>
                    <td colSpan={3} className="empty-cell">
                      {!isLiveAccessRoleSupported ? "현재 권한에서는 출입 제어를 사용할 수 없습니다." : "검색어를 입력해 회원을 조회하세요."}
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
              <h2 className="ops-section__title">현재 입장 회원</h2>
              <p className="ops-section__subtitle">지금 센터 내부에 있는 회원 목록입니다.</p>
            </div>
          </div>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="ops-right">입장 시각</th>
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
                  <tr><td colSpan={2} className="empty-cell">현재 입장 중인 회원이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* RECENT EVENTS */}
        <section className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">출입 이력</h2>
              <p className="ops-section__subtitle">선택한 회원 또는 최근 출입 이벤트를 빠르게 확인합니다.</p>
            </div>
          </div>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>이벤트</th>
                  <th className="ops-right">상태</th>
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
                  <tr><td colSpan={2} className="empty-cell">최근 출입 이력이 없습니다.</td></tr>
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
