import { useEffect } from "react";

import { formatDate } from "../../shared/format";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import { useReservationTargetsQuery } from "./modules/useReservationTargetsQuery";

export default function ReservationsPage() {
  const { selectedMember, selectMember, selectedMemberLoading } = useSelectedMemberStore();
  const {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    reservationTargetsLoading,
    reservationTargetsError,
    loadReservationTargets
  } = useReservationTargetsQuery();

  const pagination = usePagination(reservationTargets, {
    initialPageSize: 10,
    resetDeps: [reservationTargetsKeyword, reservationTargets.length]
  });

  useEffect(() => {
    void loadReservationTargets();
  }, []);

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
            <p>이 단계에서는 선택 회원과 target list visibility 계약만 복제합니다.</p>
          </div>
        </div>
        <SelectedMemberContextBadge />
        <div className="placeholder-stack">
          <div className="placeholder-card">
            <h3>다음 parity 대상</h3>
            <ul>
              <li>trainer-scoped reservation target filtering</li>
              <li>workspace picker fallback and detail modal parity</li>
              <li>reservable membership policy and expired membership exclusion</li>
            </ul>
          </div>
        </div>
      </article>
    </section>
  );
}
