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

const eventLabel = {
  ENTRY_GRANTED: "입장 승인",
  EXIT: "퇴장",
  ENTRY_DENIED: "입장 거절"
} as const;

export default function AccessPage() {
  const { authUser, isMockMode } = useAuthState();
  const { selectedMember, selectedMemberId, selectMember } = useSelectedMemberStore();
  const [accessMemberQuery, setAccessMemberQuery] = useState("");
  const debouncedAccessMemberQuery = useDebouncedValue(accessMemberQuery, 250);
  const {
    members,
    membersLoading,
    membersQueryError,
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
    accessEventsLoading,
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
    if (!isLiveAccessRoleSupported) {
      return;
    }
    void loadMembers({ name: debouncedAccessMemberQuery, phone: debouncedAccessMemberQuery });
  }, [debouncedAccessMemberQuery, isLiveAccessRoleSupported]);

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
  }, [selectedMemberId, isLiveAccessRoleSupported]);

  async function runAccessAction(action: () => Promise<boolean>) {
    const ok = await action();
    if (ok) {
      await reloadAccessData(selectedMemberId);
    } else {
      await reloadAccessData(selectedMemberId);
    }
  }

  const selectedMemberInSearch = members.find((member) => member.memberId === selectedMemberId) ?? selectedMember;

  return (
    <section className="members-prototype-layout">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>출입 관리 프로토타입</h1>
            <p>selected member handoff, current presence, recent access events, 그리고 access action parity를 새 구조에서 검증합니다.</p>
          </div>
        </div>

        <SelectedMemberContextBadge />

        {!isLiveAccessRoleSupported ? (
          <div className="selected-member-card" style={{ marginBottom: 16 }}>
            <div className="selected-member-card-header">
              <div>
                <h2>이 역할은 live 출입 관리 미지원</h2>
                <p>
                  현재 live backend는 출입 관리 읽기/쓰기 API를 관리자 또는 데스크 계정에만 열어두고 있습니다.
                  트레이너 세션에서는 이 화면을 구조 검증용 blocker로만 유지합니다.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="selected-member-card" style={{ marginBottom: 16 }}>
          <div className="selected-member-card-header">
            <div>
              <h2>선택 회원 출입 처리</h2>
              <p>
                {selectedMemberInSearch
                  ? `#${selectedMemberInSearch.memberId} ${selectedMemberInSearch.memberName}`
                  : "회원을 선택하면 입장/퇴장 액션을 빠르게 실행할 수 있습니다."}
              </p>
            </div>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="primary-button"
              disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
              onClick={() => selectedMemberId && void runAccessAction(() => handleAccessEntry(selectedMemberId))}
            >
              {accessActionSubmitting ? "처리 중..." : "입장 처리"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={!selectedMemberId || accessActionSubmitting || !isLiveAccessRoleSupported}
              onClick={() => selectedMemberId && void runAccessAction(() => handleAccessExit(selectedMemberId))}
            >
              퇴장 처리
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void reloadAccessData(selectedMemberId)}
              disabled={accessPresenceLoading || accessEventsLoading || !isLiveAccessRoleSupported}
            >
              {accessPresenceLoading || accessEventsLoading ? "새로고침 중..." : "새로고침"}
            </button>
          </div>
          {accessPanelMessage ? <p>{accessPanelMessage}</p> : null}
          {accessPanelError ? <p className="error-text">{accessPanelError}</p> : null}
        </div>

        <div className="selected-member-card" style={{ marginBottom: 16 }}>
          <h2>오늘 출입 요약</h2>
          <dl className="selected-member-grid">
            <div>
              <dt>현재 입장중</dt>
              <dd>{accessPresence?.openSessionCount ?? 0}</dd>
            </div>
            <div>
              <dt>오늘 입장</dt>
              <dd>{accessPresence?.todayEntryGrantedCount ?? 0}</dd>
            </div>
            <div>
              <dt>오늘 퇴장</dt>
              <dd>{accessPresence?.todayExitCount ?? 0}</dd>
            </div>
            <div>
              <dt>오늘 거절</dt>
              <dd>{accessPresence?.todayEntryDeniedCount ?? 0}</dd>
            </div>
          </dl>
        </div>

        <div className="placeholder-card">
          <h2>회원 검색 결과</h2>
          <label>
            회원 검색 (ID/이름/전화)
            <input
              value={accessMemberQuery}
              onChange={(event) => setAccessMemberQuery(event.target.value)}
              placeholder="예: 김민수, 010-1234"
              disabled={!isLiveAccessRoleSupported}
            />
          </label>
          {membersQueryError ? <p className="error-text">{membersQueryError}</p> : null}
          <div className="table-shell" style={{ marginTop: 12 }}>
            <table className="members-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>이름</th>
                  <th>연락처</th>
                  <th>회원권 상태</th>
                  <th>대표 만료일</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {memberResultsPagination.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      {!isLiveAccessRoleSupported
                        ? "현재 역할에서는 live 출입 관리용 회원 검색을 제공하지 않습니다."
                        : membersLoading
                          ? "조회 중..."
                          : "검색 결과 회원이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  memberResultsPagination.pagedItems.map((member: MemberSummary) => (
                    <tr key={member.memberId} className={member.memberId === selectedMemberId ? "is-selected-row" : undefined}>
                      <td>{member.memberId}</td>
                      <td>{member.memberName}</td>
                      <td>{member.phone}</td>
                      <td>{member.membershipOperationalStatus}</td>
                      <td>{formatDate(member.membershipExpiryDate)}</td>
                      <td>
                        <button type="button" className="secondary-button" onClick={() => void selectMember(member.memberId)}>
                          이 회원 선택
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={memberResultsPagination.page}
            totalPages={memberResultsPagination.totalPages}
            pageSize={memberResultsPagination.pageSize}
            pageSizeOptions={[10, 20]}
            totalItems={memberResultsPagination.totalItems}
            startItemIndex={memberResultsPagination.startItemIndex}
            endItemIndex={memberResultsPagination.endItemIndex}
            onPageChange={memberResultsPagination.setPage}
            onPageSizeChange={memberResultsPagination.setPageSize}
          />
        </div>
      </article>

      <aside className="selected-member-card" style={{ display: "grid", gap: 16 }}>
        <section>
          <h2>현재 입장중 회원</h2>
          {accessQueryError ? <p className="error-text">{accessQueryError}</p> : null}
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>회원</th>
                  <th>회원권</th>
                  <th>예약</th>
                  <th>입장시각</th>
                </tr>
              </thead>
              <tbody>
                {openSessionsPagination.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      {!isLiveAccessRoleSupported
                        ? "현재 역할에서는 live 입장 현황을 조회할 수 없습니다."
                        : "현재 입장중 회원이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  openSessionsPagination.pagedItems.map((session) => (
                    <tr key={session.accessSessionId}>
                      <td>{session.memberName}</td>
                      <td>{session.membershipId ?? "-"}</td>
                      <td>{session.reservationId ?? "-"}</td>
                      <td>{formatDateTime(session.entryAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={openSessionsPagination.page}
            totalPages={openSessionsPagination.totalPages}
            pageSize={openSessionsPagination.pageSize}
            pageSizeOptions={[10, 20]}
            totalItems={openSessionsPagination.totalItems}
            startItemIndex={openSessionsPagination.startItemIndex}
            endItemIndex={openSessionsPagination.endItemIndex}
            onPageChange={openSessionsPagination.setPage}
            onPageSizeChange={openSessionsPagination.setPageSize}
          />
        </section>

        <section>
          <h2>최근 출입 이벤트</h2>
          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>회원ID</th>
                  <th>이벤트</th>
                  <th>회원권</th>
                  <th>거절사유</th>
                  <th>처리시각</th>
                </tr>
              </thead>
              <tbody>
                {accessEventsPagination.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      {!isLiveAccessRoleSupported
                        ? "현재 역할에서는 live 출입 이벤트를 조회할 수 없습니다."
                        : accessEventsLoading
                          ? "출입 이벤트를 불러오는 중..."
                          : "출입 이벤트가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  accessEventsPagination.pagedItems.map((event) => (
                    <tr key={event.accessEventId}>
                      <td>{event.memberId}</td>
                      <td>{eventLabel[event.eventType]}</td>
                      <td>{event.membershipId ?? "-"}</td>
                      <td>{event.denyReason ?? "-"}</td>
                      <td>{formatDateTime(event.processedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={accessEventsPagination.page}
            totalPages={accessEventsPagination.totalPages}
            pageSize={accessEventsPagination.pageSize}
            pageSizeOptions={[10, 20]}
            totalItems={accessEventsPagination.totalItems}
            startItemIndex={accessEventsPagination.startItemIndex}
            endItemIndex={accessEventsPagination.endItemIndex}
            onPageChange={accessEventsPagination.setPage}
            onPageSizeChange={accessEventsPagination.setPageSize}
          />
        </section>
      </aside>
    </section>
  );
}
