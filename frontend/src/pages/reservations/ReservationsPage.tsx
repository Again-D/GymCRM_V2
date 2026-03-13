import { useEffect, useMemo, useState } from "react";

import { formatDate } from "../../shared/format";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";
import { SelectedMemberContextBadge } from "../members/components/SelectedMemberContextBadge";
import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { ReservationRow } from "../members/modules/types";
import { isMembershipReservableOn } from "./modules/reservableMemberships";
import { useReservationSchedulesQuery } from "./modules/useReservationSchedulesQuery";
import { useReservationTargetsQuery } from "./modules/useReservationTargetsQuery";
import { useSelectedMemberReservationsState } from "./modules/useSelectedMemberReservationsState";

type ReservationCreateForm = {
  membershipId: string;
  scheduleId: string;
  memo: string;
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

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
  const {
    selectedMemberReservations,
    selectedMemberReservationsLoading,
    selectedMemberReservationsError,
    loadSelectedMemberReservations,
    resetSelectedMemberReservationsState,
    createReservation,
    checkInReservation,
    completeReservation,
    cancelReservation,
    noShowReservation
  } = useSelectedMemberReservationsState();
  const [reservationCreateForm, setReservationCreateForm] = useState<ReservationCreateForm>({
    membershipId: "",
    scheduleId: "",
    memo: ""
  });
  const [reservationPanelMessage, setReservationPanelMessage] = useState<string | null>(null);
  const [reservationPanelError, setReservationPanelError] = useState<string | null>(null);

  const targetsPagination = usePagination(reservationTargets, {
    initialPageSize: 10,
    resetDeps: [reservationTargetsKeyword, reservationTargets.length]
  });
  const reservationsPagination = usePagination(selectedMemberReservations, {
    initialPageSize: 10,
    resetDeps: [selectedMemberId, selectedMemberReservations.length]
  });
  const schedulesPagination = usePagination(reservationSchedules, {
    initialPageSize: 5,
    resetDeps: [reservationSchedules.length]
  });

  const businessDateText = new Date().toISOString().slice(0, 10);
  const reservableMemberships = selectedMemberMemberships.filter((membership) =>
    isMembershipReservableOn(membership, businessDateText)
  );
  const selectedTarget = useMemo(
    () => reservationTargets.find((target) => target.memberId === selectedMember?.memberId) ?? null,
    [reservationTargets, selectedMember]
  );

  useEffect(() => {
    void loadReservationTargets(debouncedReservationTargetsKeyword);
  }, [debouncedReservationTargetsKeyword]);

  useEffect(() => {
    void loadReservationSchedules();
    return () => {
      resetReservationSchedulesQuery();
    };
  }, []);

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      resetSelectedMemberReservationsState();
      setReservationCreateForm({
        membershipId: "",
        scheduleId: "",
        memo: ""
      });
      setReservationPanelMessage(null);
      setReservationPanelError(null);
      return;
    }

    void loadSelectedMemberMemberships(selectedMemberId);
    void loadSelectedMemberReservations(selectedMemberId);
    setReservationCreateForm({
      membershipId: "",
      scheduleId: "",
      memo: ""
    });
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, [selectedMemberId]);

  function clearPanelFeedback() {
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }

  function scheduleForReservation(reservation: ReservationRow) {
    return reservationSchedules.find((schedule) => schedule.scheduleId === reservation.scheduleId) ?? null;
  }

  async function handleReservationCreateSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearPanelFeedback();

    if (!selectedMemberId) {
      setReservationPanelError("회원을 먼저 선택해야 합니다.");
      return;
    }

    const membershipId = Number(reservationCreateForm.membershipId);
    const scheduleId = Number(reservationCreateForm.scheduleId);
    const membership = reservableMemberships.find((item) => item.membershipId === membershipId);
    const schedule = reservationSchedules.find((item) => item.scheduleId === scheduleId);

    if (!membership || !schedule) {
      setReservationPanelError("예약에 필요한 회원권과 스케줄을 모두 선택해야 합니다.");
      return;
    }

    try {
      const reservation = await createReservation({
        memberId: selectedMemberId,
        membershipId,
        scheduleId,
        memo: reservationCreateForm.memo
      });
      await Promise.all([
        loadSelectedMemberReservations(selectedMemberId),
        loadSelectedMemberMemberships(selectedMemberId),
        loadReservationTargets(debouncedReservationTargetsKeyword)
      ]);
      setReservationCreateForm({
        membershipId: "",
        scheduleId: "",
        memo: ""
      });
      setReservationPanelMessage(`예약 #${reservation.reservationId}를 생성했습니다.`);
    } catch (error) {
      setReservationPanelError(error instanceof Error ? error.message : "예약 생성에 실패했습니다.");
    }
  }

  async function mutateReservation(
    reservationId: number,
    actionName: string,
    mutate: () => Promise<void>,
    canMutate: boolean,
    errorMessage: string
  ) {
    clearPanelFeedback();
    if (!canMutate) {
      setReservationPanelError(errorMessage);
      return;
    }
    if (!selectedMemberId) {
      setReservationPanelError("회원을 먼저 선택해야 합니다.");
      return;
    }
    try {
      await mutate();
      await Promise.all([
        loadSelectedMemberReservations(selectedMemberId),
        loadSelectedMemberMemberships(selectedMemberId),
        loadReservationTargets(debouncedReservationTargetsKeyword)
      ]);
      setReservationPanelMessage(actionName);
    } catch (error) {
      setReservationPanelError(error instanceof Error ? error.message : `${actionName}에 실패했습니다.`);
    }
  }

  return (
    <section className="members-prototype-layout">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>예약 관리 프로토타입</h1>
            <p>예약 대상 선택, 선택 회원 handoff, 예약 생성과 상태 조정 surface를 새 구조에서 다시 설명합니다.</p>
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
              {targetsPagination.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    예약 대상 회원이 없습니다.
                  </td>
                </tr>
              ) : (
                targetsPagination.pagedItems.map((target) => (
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
          page={targetsPagination.page}
          totalPages={targetsPagination.totalPages}
          pageSize={targetsPagination.pageSize}
          pageSizeOptions={[10, 20]}
          totalItems={targetsPagination.totalItems}
          startItemIndex={targetsPagination.startItemIndex}
          endItemIndex={targetsPagination.endItemIndex}
          onPageChange={targetsPagination.setPage}
          onPageSizeChange={targetsPagination.setPageSize}
        />
      </article>

      <article className="selected-member-card">
        <div className="selected-member-card-header">
          <div>
            <h2>선택 회원 예약 컨텍스트</h2>
            <p>선택 회원 handoff, 예약 가능 회원권 규칙, 예약 액션 surface를 하나의 page composition 안에 두는 방향을 확인합니다.</p>
          </div>
        </div>

        <SelectedMemberContextBadge />
        {selectedMemberMembershipsError ? <p className="error-text">{selectedMemberMembershipsError}</p> : null}
        {selectedMemberReservationsError ? <p className="error-text">{selectedMemberReservationsError}</p> : null}
        {reservationSchedulesError ? <p className="error-text">{reservationSchedulesError}</p> : null}
        {reservationPanelMessage ? <p>{reservationPanelMessage}</p> : null}
        {reservationPanelError ? <p className="error-text">{reservationPanelError}</p> : null}

        <div className="placeholder-stack">
          <div className="placeholder-card">
            <h3>선택 회원 요약</h3>
            {selectedMember == null ? (
              <p>회원을 선택하면 예약 상세 surface가 열립니다.</p>
            ) : (
              <dl className="selected-member-grid">
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
                  <dt>대표 만료일</dt>
                  <dd>{selectedTarget?.membershipExpiryDate ? formatDate(selectedTarget.membershipExpiryDate) : "-"}</dd>
                </div>
                <div>
                  <dt>예약 가능 회원권</dt>
                  <dd>{reservableMemberships.length}</dd>
                </div>
                <div>
                  <dt>예약 수</dt>
                  <dd>{selectedMemberReservations.length}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="placeholder-card">
            <h3>예약 생성</h3>
            <form className="members-filter-grid" onSubmit={handleReservationCreateSubmit}>
              <label>
                사용할 회원권
                <select
                  value={reservationCreateForm.membershipId}
                  onChange={(event) =>
                    setReservationCreateForm((prev) => ({ ...prev, membershipId: event.target.value }))
                  }
                >
                  <option value="">선택하세요</option>
                  {reservableMemberships.map((membership) => (
                    <option key={membership.membershipId} value={membership.membershipId}>
                      #{membership.membershipId} · {membership.productNameSnapshot}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                예약 스케줄
                <select
                  value={reservationCreateForm.scheduleId}
                  onChange={(event) =>
                    setReservationCreateForm((prev) => ({ ...prev, scheduleId: event.target.value }))
                  }
                >
                  <option value="">선택하세요</option>
                  {reservationSchedules.map((schedule) => (
                    <option key={schedule.scheduleId} value={schedule.scheduleId}>
                      #{schedule.scheduleId} · [{schedule.scheduleType}] {schedule.slotTitle} · {schedule.trainerName}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                메모
                <input
                  value={reservationCreateForm.memo}
                  onChange={(event) => setReservationCreateForm((prev) => ({ ...prev, memo: event.target.value }))}
                />
              </label>
              <div className="toolbar-actions" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="primary-button" disabled={!selectedMember || selectedMemberReservationsLoading}>
                  예약 생성
                </button>
              </div>
            </form>
            {selectedMemberMembershipsLoading ? <p>회원권 목록을 불러오는 중...</p> : null}
            {!selectedMemberMembershipsLoading && selectedMember && reservableMemberships.length === 0 ? (
              <p>예약 가능한 회원권이 없습니다.</p>
            ) : null}
          </div>

          <div className="placeholder-card">
            <h3>선택 회원 예약 목록</h3>
            {selectedMemberReservationsLoading ? (
              <p>예약 이력을 불러오는 중...</p>
            ) : reservationsPagination.pagedItems.length === 0 ? (
              <p>선택 회원의 예약 이력이 없습니다.</p>
            ) : (
              <>
                <div className="table-shell">
                  <table className="members-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>스케줄</th>
                        <th>회원권</th>
                        <th>상태</th>
                        <th>예약시각</th>
                        <th>액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservationsPagination.pagedItems.map((reservation) => {
                        const schedule = scheduleForReservation(reservation);
                        const canMutate = reservation.reservationStatus === "CONFIRMED";
                        const canCheckIn = canMutate && !reservation.checkedInAt;
                        const canNoShow =
                          canMutate &&
                          !reservation.checkedInAt &&
                          schedule != null &&
                          Date.parse(schedule.endAt) <= Date.now();

                        return (
                          <tr key={reservation.reservationId}>
                            <td>{reservation.reservationId}</td>
                            <td>{reservation.scheduleId}</td>
                            <td>{reservation.membershipId}</td>
                            <td>{reservation.reservationStatus}</td>
                            <td>{formatDateTime(reservation.reservedAt)}</td>
                            <td>
                              <div className="row-actions">
                                <button
                                  type="button"
                                  className="secondary-button"
                                  disabled={!canCheckIn}
                                  onClick={() =>
                                    mutateReservation(
                                      reservation.reservationId,
                                      `예약 #${reservation.reservationId} 체크인 처리`,
                                      () =>
                                        selectedMemberId == null
                                          ? Promise.reject(new Error("회원을 먼저 선택해야 합니다."))
                                          : checkInReservation(selectedMemberId, reservation.reservationId).then(() => undefined),
                                      canCheckIn,
                                      "체크인 가능한 예약이 아닙니다."
                                    )
                                  }
                                >
                                  체크인
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  disabled={!canMutate}
                                  onClick={() =>
                                    mutateReservation(
                                      reservation.reservationId,
                                      `예약 #${reservation.reservationId} 완료 처리`,
                                      () =>
                                        selectedMemberId == null
                                          ? Promise.reject(new Error("회원을 먼저 선택해야 합니다."))
                                          : completeReservation(selectedMemberId, reservation.reservationId).then(() => undefined),
                                      canMutate,
                                      "확정 예약만 완료 처리할 수 있습니다."
                                    )
                                  }
                                >
                                  완료
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  disabled={!canMutate}
                                  onClick={() =>
                                    mutateReservation(
                                      reservation.reservationId,
                                      `예약 #${reservation.reservationId} 취소 처리`,
                                      () =>
                                        selectedMemberId == null
                                          ? Promise.reject(new Error("회원을 먼저 선택해야 합니다."))
                                          : cancelReservation(selectedMemberId, reservation.reservationId).then(() => undefined),
                                      canMutate,
                                      "확정 예약만 취소할 수 있습니다."
                                    )
                                  }
                                >
                                  취소
                                </button>
                                <button
                                  type="button"
                                  className="secondary-button"
                                  disabled={!canNoShow}
                                  onClick={() =>
                                    mutateReservation(
                                      reservation.reservationId,
                                      `예약 #${reservation.reservationId} 노쇼 처리`,
                                      () =>
                                        selectedMemberId == null
                                          ? Promise.reject(new Error("회원을 먼저 선택해야 합니다."))
                                          : noShowReservation(selectedMemberId, reservation.reservationId).then(() => undefined),
                                      canNoShow,
                                      "종료된 미체크인 확정 예약만 노쇼 처리할 수 있습니다."
                                    )
                                  }
                                >
                                  노쇼
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  page={reservationsPagination.page}
                  totalPages={reservationsPagination.totalPages}
                  pageSize={reservationsPagination.pageSize}
                  pageSizeOptions={[10, 20]}
                  totalItems={reservationsPagination.totalItems}
                  startItemIndex={reservationsPagination.startItemIndex}
                  endItemIndex={reservationsPagination.endItemIndex}
                  onPageChange={reservationsPagination.setPage}
                  onPageSizeChange={reservationsPagination.setPageSize}
                />
              </>
            )}
          </div>

          <div className="placeholder-card">
            <h3>예약 스케줄 목록</h3>
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
        </div>
      </article>
    </section>
  );
}
