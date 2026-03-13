import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSelectedMemberContext } from "../members/useSelectedMemberOwner";
import { NoticeText } from "../../shared/ui/NoticeText";
import { OverlayPanel } from "../../shared/ui/OverlayPanel";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { usePagination } from "../../shared/hooks/usePagination";
import { formatDate, formatDateTime } from "../../shared/utils/format";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";

type ReservationTargetSummary = {
  memberId: number;
  memberCode: string;
  memberName: string;
  phone: string;
  reservableMembershipCount: number;
  membershipExpiryDate: string | null;
  confirmedReservationCount: number;
};

type ReservableMembershipRow = {
  membershipId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  remainingCount: number | null;
  endDate: string | null;
};

type ReservationRow = {
  reservationId: number;
  membershipId: number;
  scheduleId: number;
  reservationStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reservedAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  checkedInAt: string | null;
};

type ReservationsSectionProps = {
  reservationTargets: ReservationTargetSummary[];
  reservationTargetsLoading: boolean;
  reservationTargetsKeyword: string;
  onReservationTargetsKeywordChange: (value: string) => void;
  onReservationTargetsSearch: () => void;
  selectedMemberReservationsCount: number;
  reservableMembershipsCount: number;
  reservableMemberships: ReservableMembershipRow[];
  selectedMemberReservations: ReservationRow[];
  reservationPanelMessage: string | null;
  reservationPanelError: string | null;
  onGoMembers: () => void;
  children: ReactNode;
};

export function ReservationsSection({
  reservationTargets,
  reservationTargetsLoading,
  reservationTargetsKeyword,
  onReservationTargetsKeywordChange,
  onReservationTargetsSearch,
  selectedMemberReservationsCount,
  reservableMembershipsCount,
  reservableMemberships,
  selectedMemberReservations,
  reservationPanelMessage,
  reservationPanelError,
  onGoMembers,
  children
}: ReservationsSectionProps) {
  const { selectedMember, selectMember } = useSelectedMemberContext();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const reservationTargetsPagination = usePagination(reservationTargets, {
    initialPageSize: 10,
    resetDeps: [reservationTargetsKeyword, reservationTargets.length]
  });

  useEffect(() => {
    if (!selectedMember) {
      setIsDetailOpen(false);
    }
  }, [selectedMember]);

  const selectedTarget = useMemo(
    () => reservationTargets.find((target) => target.memberId === selectedMember?.memberId) ?? null,
    [reservationTargets, selectedMember]
  );

  return (
    <section className="membership-ops-shell" aria-label="예약 관리 화면">
      <article className="panel">
        <PanelHeader
          title="회원권 보유 회원 리스트"
          actions={
            <div className="panel-header-actions">
              <button type="button" className="secondary-button" onClick={onReservationTargetsSearch}>
                {reservationTargetsLoading ? "조회 중..." : "조회"}
              </button>
              <button type="button" className="secondary-button" onClick={onGoMembers}>
                회원 관리 열기
              </button>
            </div>
          }
        />
        <div className="toolbar-row">
          <label className="toolbar-field">
            검색
            <input
              value={reservationTargetsKeyword}
              onChange={(event) => onReservationTargetsKeywordChange(event.target.value)}
              placeholder="예: 김민수, 010-1234, 102"
            />
          </label>
        </div>
        <div className="list-shell deferred-list-surface">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>회원코드</th>
                <th>회원명</th>
                <th>연락처</th>
                <th>예약 가능 회원권</th>
                <th>확정 예약</th>
                <th>만료일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {reservationTargetsPagination.pagedItems.length === 0 ? (
                <EmptyTableRow colSpan={8} message="예약 대상 회원이 없습니다." />
              ) : (
                reservationTargetsPagination.pagedItems.map((target) => (
                  <tr
                    key={target.memberId}
                    className={selectedMember?.memberId === target.memberId ? "is-selected" : undefined}
                    onClick={async () => {
                      const loaded = await selectMember(target.memberId);
                      if (loaded) {
                        setIsDetailOpen(true);
                      }
                    }}
                  >
                    <td>{target.memberId}</td>
                    <td>{target.memberCode}</td>
                    <td>{target.memberName}</td>
                    <td>{target.phone}</td>
                    <td>{target.reservableMembershipCount}</td>
                    <td>{target.confirmedReservationCount}</td>
                    <td>{target.membershipExpiryDate ? formatDate(target.membershipExpiryDate) : "-"}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void selectMember(target.memberId);
                        }}
                      >
                        {selectedMember?.memberId === target.memberId ? "선택됨" : "선택"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={reservationTargetsPagination.page}
          totalPages={reservationTargetsPagination.totalPages}
          pageSize={reservationTargetsPagination.pageSize}
          pageSizeOptions={[10, 20, 50]}
          totalItems={reservationTargetsPagination.totalItems}
          startItemIndex={reservationTargetsPagination.startItemIndex}
          endItemIndex={reservationTargetsPagination.endItemIndex}
          onPageChange={reservationTargetsPagination.setPage}
          onPageSizeChange={reservationTargetsPagination.setPageSize}
        />
      </article>

      {selectedMember ? (
        <>
          <article className="panel">
            <PanelHeader
              title="선택 회원 예약 상세"
              actions={
                <div className="panel-header-actions">
                  <button type="button" className="secondary-button" onClick={() => setIsDetailOpen(true)}>
                    상세 모달
                  </button>
                  <button type="button" className="secondary-button" onClick={onGoMembers}>
                    회원 관리 열기
                  </button>
                </div>
              }
            />
            <dl className="detail-grid compact-detail-grid">
              <div>
                <dt>회원 ID</dt>
                <dd>{selectedMember.memberId}</dd>
              </div>
              <div>
                <dt>회원명</dt>
                <dd>{selectedMember.memberName}</dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>{selectedMember.phone}</dd>
              </div>
              <div>
                <dt>회원 상태</dt>
                <dd>{selectedMember.memberStatus}</dd>
              </div>
              <div>
                <dt>예약 수(세션)</dt>
                <dd>{selectedMemberReservationsCount}</dd>
              </div>
              <div>
                <dt>예약 가능 회원권</dt>
                <dd>{reservableMembershipsCount}</dd>
              </div>
              <div>
                <dt>대표 만료일</dt>
                <dd>{selectedTarget?.membershipExpiryDate ? formatDate(selectedTarget.membershipExpiryDate) : "-"}</dd>
              </div>
            </dl>
            {reservationPanelMessage ? (
              <NoticeText tone="success" compact>
                {reservationPanelMessage}
              </NoticeText>
            ) : null}
            {reservationPanelError ? (
              <NoticeText tone="error" compact>
                {reservationPanelError}
              </NoticeText>
            ) : null}
          </article>

          {children}

          <OverlayPanel open={isDetailOpen} title="예약 회원 상세" onClose={() => setIsDetailOpen(false)}>
            <section className="overlay-stack">
              <dl className="detail-grid compact-detail-grid">
                <div>
                  <dt>회원 ID</dt>
                  <dd>{selectedMember.memberId}</dd>
                </div>
                <div>
                  <dt>회원명</dt>
                  <dd>{selectedMember.memberName}</dd>
                </div>
                <div>
                  <dt>연락처</dt>
                  <dd>{selectedMember.phone}</dd>
                </div>
                <div>
                  <dt>회원 상태</dt>
                  <dd>{selectedMember.memberStatus}</dd>
                </div>
              </dl>

              <article className="panel">
                <PanelHeader title="예약 가능 회원권" />
                <div className="list-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>회원권 ID</th>
                        <th>상품</th>
                        <th>유형</th>
                        <th>잔여</th>
                        <th>만료일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservableMemberships.length === 0 ? (
                        <EmptyTableRow colSpan={5} message="예약 가능한 회원권이 없습니다." />
                      ) : (
                        reservableMemberships.map((membership) => (
                          <tr key={membership.membershipId}>
                            <td>{membership.membershipId}</td>
                            <td>{membership.productNameSnapshot}</td>
                            <td>{membership.productTypeSnapshot}</td>
                            <td>{membership.remainingCount ?? "-"}</td>
                            <td>{membership.endDate ? formatDate(membership.endDate) : "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="panel">
                <PanelHeader title="예약 이력" />
                <div className="list-shell">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>스케줄ID</th>
                        <th>회원권ID</th>
                        <th>상태</th>
                        <th>예약시각</th>
                        <th>체크인</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMemberReservations.length === 0 ? (
                        <EmptyTableRow colSpan={6} message="예약 이력이 없습니다." />
                      ) : (
                        selectedMemberReservations.map((reservation) => (
                          <tr key={reservation.reservationId}>
                            <td>{reservation.reservationId}</td>
                            <td>{reservation.scheduleId}</td>
                            <td>{reservation.membershipId}</td>
                            <td>{reservation.reservationStatus}</td>
                            <td>{formatDateTime(reservation.reservedAt)}</td>
                            <td>{formatDateTime(reservation.checkedInAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </OverlayPanel>
        </>
      ) : (
        <article className="panel">
          <NoticeText compact>회원을 선택하면 상세 패널과 예약 조정 화면이 열립니다.</NoticeText>
        </article>
      )}
    </section>
  );
}
