import { useEffect } from "react";

import { formatDate } from "../../shared/format";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import { isMembershipReservableOn } from "./modules/reservableMemberships";
import { useReservationSchedulesQuery } from "./modules/useReservationSchedulesQuery";
import { useReservationTargetsQuery } from "./modules/useReservationTargetsQuery";

export default function ReservationsPage() {
  const { selectedMember, selectedMemberId, selectMember, selectedMemberLoading } = useSelectedMemberStore();
  const {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    reservationTargetsLoading,
    reservationTargetsError,
    loadReservationTargets
  } = useReservationTargetsQuery();
  const debouncedReservationTargetsKeyword = useDebouncedValue(reservationTargetsKeyword, 250);
  const {
    selectedMemberMemberships,
    selectedMemberMembershipsLoading,
    selectedMemberMembershipsError,
    loadSelectedMemberMemberships,
    resetSelectedMemberMembershipsQuery
  } = useSelectedMemberMembershipsQuery();
  const {
    reservationSchedules,
    reservationSchedulesLoading,
    reservationSchedulesError,
    loadReservationSchedules,
    resetReservationSchedulesQuery
  } = useReservationSchedulesQuery();

  const pagination = usePagination(reservationTargets, {
    initialPageSize: 10,
    resetDeps: [reservationTargetsKeyword, reservationTargets.length]
  });
  const schedulesPagination = usePagination(reservationSchedules, {
    initialPageSize: 5,
    resetDeps: [reservationSchedules.length]
  });

  const businessDateText = new Date().toISOString().slice(0, 10);
  const reservableMemberships = selectedMemberMemberships.filter((membership) =>
    isMembershipReservableOn(membership, businessDateText)
  );

  useEffect(() => {
    void loadReservationTargets(debouncedReservationTargetsKeyword);
    void loadReservationSchedules();
    return () => {
      resetReservationSchedulesQuery();
    };
  }, [debouncedReservationTargetsKeyword]);

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      return;
    }
    void loadSelectedMemberMemberships(selectedMemberId);
  }, [selectedMemberId]);

  return (
    <section className="members-prototype-layout">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>예약 관리 프로토타입</h1>
            <p>예약 대상 회원 리스트와 selected-member handoff를 먼저 복제합니다.</p>
          </div>
        </div>

        <form
          className="context-fallback-toolbar"
          onSubmit={(event) => {
            event.preventDefault();
            void loadReservationTargets(reservationTargetsKeyword);
          }}
        >
          <label>
            예약 대상 검색
            <input
              value={reservationTargetsKeyword}
              onChange={(event) => setReservationTargetsKeyword(event.target.value)}
              placeholder="예: 김민수, 010-1234, 회원코드"
            />
          </label>
          <div className="toolbar-actions">
            <button type="submit" className="primary-button" disabled={reservationTargetsLoading}>
              {reservationTargetsLoading ? "조회 중..." : "조회"}
            </button>
          </div>
        </form>

        {reservationTargetsError ? <p className="error-text">{reservationTargetsError}</p> : null}

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>회원코드</th>
                <th>회원명</th>
                <th>연락처</th>
                <th>예약 가능 회원권</th>
                <th>확정 예약</th>
                <th>대표 만료일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    예약 대상 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                pagination.pagedItems.map((target) => (
                  <tr key={target.memberId} className={selectedMember?.memberId === target.memberId ? "is-selected-row" : undefined}>
                    <td>{target.memberId}</td>
                    <td>{target.memberCode}</td>
                    <td>{target.memberName}</td>
                    <td>{target.phone}</td>
                    <td>{target.reservableMembershipCount}</td>
                    <td>{target.confirmedReservationCount}</td>
                    <td>{formatDate(target.membershipExpiryDate)}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={selectedMemberLoading}
                        onClick={() => void selectMember(target.memberId)}
                      >
                        {selectedMember?.memberId === target.memberId ? "선택됨" : "이 회원 선택"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          pageSizeOptions={[10, 20]}
          totalItems={pagination.totalItems}
          startItemIndex={pagination.startItemIndex}
          endItemIndex={pagination.endItemIndex}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </article>

      <article className="selected-member-card">
        <div className="selected-member-card-header">
          <div>
            <h2>선택 회원 예약 컨텍스트</h2>
            <p>선택 회원 handoff 위에 예약 가능 회원권 규칙과 스케줄 query guard를 다시 붙입니다.</p>
          </div>
        </div>
        <SelectedMemberContextBadge />
        {selectedMemberMembershipsError ? <p className="error-text">{selectedMemberMembershipsError}</p> : null}
        {reservationSchedulesError ? <p className="error-text">{reservationSchedulesError}</p> : null}
        <div className="placeholder-stack">
          <div className="placeholder-card">
            <h3>예약 가능 회원권</h3>
            <p>현재 기준일 `{businessDateText}`에 맞춰 `ACTIVE`, 미만료, 횟수 잔여 조건을 모두 통과한 회원권만 예약 가능으로 간주합니다.</p>
            {selectedMember == null ? (
              <p>회원을 선택하면 예약 가능 회원권을 계산합니다.</p>
            ) : selectedMemberMembershipsLoading ? (
              <p>회원권 목록을 불러오는 중...</p>
            ) : reservableMemberships.length === 0 ? (
              <p>예약 가능한 회원권이 없습니다.</p>
            ) : (
              <ul>
                {reservableMemberships.map((membership) => (
                  <li key={membership.membershipId}>
                    #{membership.membershipId} · {membership.productNameSnapshot}
                    {membership.productTypeSnapshot === "COUNT"
                      ? ` · 잔여 ${membership.remainingCount ?? 0}`
                      : membership.endDate
                        ? ` · 만료 ${membership.endDate}`
                        : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="placeholder-card">
            <h3>예약 스케줄 query</h3>
            <p>prototype 단계에서도 schedule read는 request-version guard와 reset 경로를 가지도록 분리합니다.</p>
            {reservationSchedulesLoading ? (
              <p>예약 스케줄을 불러오는 중...</p>
            ) : schedulesPagination.pagedItems.length === 0 ? (
              <p>표시할 예약 스케줄이 없습니다.</p>
            ) : (
              <>
                <ul>
                  {schedulesPagination.pagedItems.map((schedule) => (
                    <li key={schedule.scheduleId}>
                      #{schedule.scheduleId} · {schedule.slotTitle} · {schedule.trainerName} · {formatDate(schedule.startAt)}
                    </li>
                  ))}
                </ul>
                <PaginationControls
                  page={schedulesPagination.page}
                  totalPages={schedulesPagination.totalPages}
                  pageSize={schedulesPagination.pageSize}
                  pageSizeOptions={[5, 10]}
                  totalItems={schedulesPagination.totalItems}
                  startItemIndex={schedulesPagination.startItemIndex}
                  endItemIndex={schedulesPagination.endItemIndex}
                  onPageChange={schedulesPagination.setPage}
                  onPageSizeChange={schedulesPagination.setPageSize}
                />
              </>
            )}
          </div>
          <div className="placeholder-card">
            <h3>다음 parity 대상</h3>
            <ul>
              <li>trainer-scoped reservation target filtering</li>
              <li>detail modal and reservation action surface parity</li>
              <li>cache/dedupe and stale reset coverage around reservation queries</li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  );
}
