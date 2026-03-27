import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiClientError } from "../../api/client";
import { formatDate } from "../../shared/format";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { todayLocalDate } from "../../shared/date";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";

import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { ReservationRow } from "../members/modules/types";
import { isMembershipReservableOn } from "./modules/reservableMemberships";
import { useReservationSchedulesQuery } from "./modules/useReservationSchedulesQuery";
import { useReservationTargetsQuery } from "./modules/useReservationTargetsQuery";
import { useSelectedMemberReservationsState } from "./modules/useSelectedMemberReservationsState";
import { Modal } from "../../shared/ui/Modal";

import styles from "./ReservationsPage.module.css";


type ReservationCreateForm = {
  membershipId: string;
  scheduleId: string;
  memo: string;
};

export function getReservationPanelErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiClientError && error.detail) {
    return error.detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

const statusMap: Record<string, { label: string; class: string }> = {
  "CONFIRMED": { label: "예약 확정", class: "pill ok" },
  "ATTENDED": { label: "출석", class: "pill info" },
  "CANCELLED": { label: "취소", class: "pill muted" },
  "NO_SHOW": { label: "노쇼", class: "pill danger" }
};

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
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);

  const targetsPagination = usePagination(reservationTargets, {
    initialPageSize: 10,
    resetDeps: [reservationTargetsKeyword, reservationTargets.length]
  });
  const reservationsPagination = usePagination(selectedMemberReservations, {
    initialPageSize: 10,
    resetDeps: [selectedMemberId, selectedMemberReservations.length]
  });

  const businessDateText = todayLocalDate();
  const reservableMemberships = selectedMemberMemberships.filter((membership) =>
    isMembershipReservableOn(membership, businessDateText)
  );

  useEffect(() => {
    void loadReservationTargets(debouncedReservationTargetsKeyword);
  }, [debouncedReservationTargetsKeyword, loadReservationTargets]);

  useEffect(() => {
    void loadReservationSchedules();
    return () => {
      resetReservationSchedulesQuery();
    };
  }, [loadReservationSchedules, resetReservationSchedulesQuery]);

  useEffect(() => {
    if (selectedMemberId == null) {
      resetSelectedMemberMembershipsQuery();
      resetSelectedMemberReservationsState();
      setReservationCreateForm({ membershipId: "", scheduleId: "", memo: "" });
      setReservationPanelMessage(null);
      setReservationPanelError(null);
      return;
    }

    void loadSelectedMemberMemberships(selectedMemberId);
    void loadSelectedMemberReservations(selectedMemberId);
    setReservationCreateForm({ membershipId: "", scheduleId: "", memo: "" });
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, [
    loadSelectedMemberMemberships,
    loadSelectedMemberReservations,
    resetSelectedMemberMembershipsQuery,
    resetSelectedMemberReservationsState,
    selectedMemberId
  ]);

  const clearPanelFeedback = useCallback(() => {
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, []);

  const resetCreateForm = useCallback(() => {
    setReservationCreateForm({ membershipId: "", scheduleId: "", memo: "" });
  }, []);

  const closeNewReservationModal = useCallback(() => {
    setIsNewModalOpen(false);
    if (selectedMemberId != null) {
      setIsWorkbenchOpen(true);
    }
    resetCreateForm();
  }, [resetCreateForm, selectedMemberId]);

  const openNewReservationModal = useCallback(() => {
    clearPanelFeedback();
    resetCreateForm();
    setIsWorkbenchOpen(false);
    setIsNewModalOpen(true);
  }, [clearPanelFeedback, resetCreateForm]);

  const handleReservationCreateSubmit = async () => {
    clearPanelFeedback();

    if (!selectedMemberId) {
      setReservationPanelError("회원이 선택되지 않았습니다.");
      return;
    }

    const membershipId = Number(reservationCreateForm.membershipId);
    const scheduleId = Number(reservationCreateForm.scheduleId);
    const membership = reservableMemberships.find((item) => item.membershipId === membershipId);
    const schedule = reservationSchedules.find((item) => item.scheduleId === scheduleId);

    if (!membership || !schedule) {
      setReservationPanelError("회원권 또는 수업 일정을 선택해 주세요.");
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
      resetCreateForm();
      setReservationPanelMessage(`예약 #${reservation.reservationId}이(가) 생성되었습니다.`);
      setIsNewModalOpen(false);
      setIsWorkbenchOpen(true);
    } catch (error) {
      setReservationPanelError(getReservationPanelErrorMessage(error, "예약 생성에 실패했습니다."));
    }
  };

  const mutateReservation = useCallback(async (
    reservationId: number,
    actionLabel: string,
    mutate: () => Promise<void>,
    canMutate: boolean,
    errorMessage: string
  ) => {
    clearPanelFeedback();
    if (!canMutate) {
      setReservationPanelError(errorMessage);
      return;
    }
    if (!selectedMemberId) return;

    try {
      await mutate();
      await Promise.all([
        loadSelectedMemberReservations(selectedMemberId),
        loadSelectedMemberMemberships(selectedMemberId),
        loadReservationTargets(debouncedReservationTargetsKeyword)
      ]);
      setReservationPanelMessage(`완료: ${actionLabel}`);
    } catch (error) {
      setReservationPanelError(getReservationPanelErrorMessage(error, `${actionLabel} 처리 실패.`));
    }
  }, [
    clearPanelFeedback,
    debouncedReservationTargetsKeyword,
    loadReservationTargets,
    loadSelectedMemberMemberships,
    loadSelectedMemberReservations,
    selectedMemberId
  ]);

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">예약 업무</span>
          <h1 className="ops-title">예약 관리</h1>
          <p className="ops-subtitle">회원을 선택하고 현재 예약을 확인하며 서비스 화면을 벗어나지 않고 새 예약을 등록할 수 있습니다.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">디렉터리 + 워크벤치</span>
            <span className="ops-meta__pill">회원권 연동</span>
            <span className="ops-meta__pill">빠른 상태 처리</span>
          </div>
        </div>
      </div>

      <div className="ops-stat-strip">
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">예약 대상 회원</span>
          <span className="ops-stat-card__value">{reservationTargets.length}</span>
          <span className="ops-stat-card__hint">예약 디렉터리에서 검색된 회원 수</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">선택된 회원</span>
          <div className={`row-actions ${styles.headerRow}`}>
            <span className="ops-stat-card__value">{selectedMember ? `#${selectedMember.memberId}` : "-"}</span>
            {selectedMember && (
              <button 
                type="button" 
                className={`secondary-button ${styles.miniButton}`}
                onClick={() => setIsWorkbenchOpen(true)}
              >
                워크벤치 열기
              </button>
            )}
          </div>
          <span className="ops-stat-card__hint">{selectedMember?.memberName ?? "선택된 회원이 없습니다"}</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">전체 시스템 예약</span>
          <span className="ops-stat-card__value">{reservationTargets.reduce((acc, t) => acc + t.confirmedReservationCount, 0)}</span>
          <span className="ops-stat-card__hint">현재 기준 확정된 모든 예약 건수</span>
        </div>
      </div>

    <section className="ops-section">
      
      {/* DIRECTORY PANEL */}
      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">예약 디렉터리</h2>
            <p className="ops-section__subtitle">회원을 찾아 예약 워크벤치로 고정합니다.</p>
          </div>
        </div>

        <form
          className={`context-fallback-toolbar ${styles.filterHeader}`}
          onSubmit={(event) => {
            event.preventDefault();
            void loadReservationTargets(reservationTargetsKeyword);
          }}
        >
          <label className="stack-sm">
            <span className={`text-xs text-muted ${styles.bold}`}>회원 검색</span>
            <input
              className="input"
              value={reservationTargetsKeyword}
              onChange={(event) => setReservationTargetsKeyword(event.target.value)}
              placeholder="이름 또는 전화번호"
            />
          </label>
        </form>

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>회원</th>
                <th className={styles.center}>예약 수</th>
                <th className="ops-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {targetsPagination.pagedItems.length === 0 ? (
                <tr><td colSpan={3} className={`empty-cell ${styles.emptyCell}`}>조건에 맞는 회원이 없습니다.</td></tr>
              ) : (
                targetsPagination.pagedItems.map((target) => (
                  <tr key={target.memberId} className={selectedMember?.memberId === target.memberId ? "is-selected-row" : undefined}>
                    <td>
                      <div className="stack-sm">
                        <span className={styles.bold}>{target.memberName}</span>
                        <span className="text-xs text-muted">{target.phone}</span>
                      </div>
                    </td>
                    <td className={styles.center}>
                      <span className={`pill info ${styles.smallPill}`}>{target.confirmedReservationCount}개</span>
                    </td>
                    <td className="ops-right">
                      <button
                        type="button"
                        className={`${selectedMember?.memberId === target.memberId ? "primary-button" : "secondary-button"} ${styles.actionButton}`}
                        disabled={selectedMemberLoading}
                        onClick={async () => {
                          const success = await selectMember(target.memberId);
                          if (success) setIsWorkbenchOpen(true);
                        }}
                      >
                        {selectedMember?.memberId === target.memberId ? "워크벤치 보기" : "선택 후 조회"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-md">
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
        </div>
      </article>

      {/* WORKBENCH PANEL */}
      <Modal
        isOpen={isWorkbenchOpen}
        onClose={() => setIsWorkbenchOpen(false)}
        title={`예약 워크벤치: ${selectedMember?.memberName ?? "회원"} (#${selectedMember?.memberId ?? "-"})`}
        size="lg"
        footer={
          <button type="button" className="secondary-button" onClick={() => setIsWorkbenchOpen(false)}>닫기</button>
        }
      >
        <div className="stack-lg">
          <header className={`row-actions ${styles.headerRow}`}>
            <div>
              <p className="text-muted text-xs">확정된 예약을 관리하거나 새 예약을 등록합니다.</p>
            </div>
            {selectedMember && (
              <button 
                type="button" 
                className="primary-button"
                onClick={openNewReservationModal}
              >
                신규 예약 등록
              </button>
            )}
          </header>

          <section>
            <div className="ops-section__header">
              <div>
                <h3 className="ops-section__title">현재 예약 내역</h3>
                <p className="ops-section__subtitle">선택된 회원의 확정, 출석, 취소, 노쇼 이력을 확인합니다.</p>
              </div>
            </div>
            <div className="table-shell">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>예약 시간</th>
                    <th>상태</th>
                    <th className="ops-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {reservationsPagination.pagedItems.length === 0 ? (
                    <tr><td colSpan={3} className={`empty-cell ${styles.emptyCell}`}>예약 내역이 없습니다.</td></tr>
                  ) : (
                    reservationsPagination.pagedItems.map((reservation) => {
                      const statusInfo = statusMap[reservation.reservationStatus] || { label: reservation.reservationStatus, class: 'pill muted' };
                      const canMutate = reservation.reservationStatus === "CONFIRMED";
                      const canCheckIn = canMutate && !reservation.checkedInAt;

                      return (
                        <tr key={reservation.reservationId}>
                          <td>
                            <div className="stack-sm">
                              <span className={`text-sm ${styles.bold}`}>{formatDateTime(reservation.reservedAt)}</span>
                              <span className="text-xs text-muted">ID: #{reservation.reservationId}</span>
                            </div>
                          </td>
                          <td>
                            <span className={statusInfo.class}>{statusInfo.label}</span>
                          </td>
                          <td>
                            <div className="ops-table-actions">
                              <button 
                                type="button" 
                                className="secondary-button ops-action-button"
                                disabled={!canCheckIn}
                                onClick={() => mutateReservation(reservation.reservationId, "체크인 처리", () => checkInReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canCheckIn, "이미 체크인되었거나 유효하지 않은 상태입니다.")}
                              >
                                체크인
                              </button>
                              <button 
                                type="button" 
                                className="secondary-button ops-action-button"
                                disabled={!canMutate}
                                onClick={() => mutateReservation(reservation.reservationId, "완료 처리", () => completeReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canMutate, "확정된 예약만 완료 처리할 수 있습니다.")}
                              >
                                완료
                              </button>
                              <button
                                type="button"
                                className={`secondary-button ops-action-button ${styles.danger}`}
                                disabled={!canMutate}
                                onClick={() => mutateReservation(reservation.reservationId, "예약 취소", () => cancelReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canMutate, "확정된 예약만 취소할 수 있습니다.")}
                              >
                                취소
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-md">
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
            </div>
          </section>

          {(reservationPanelMessage || reservationPanelError) && (
            <div className="mt-md">
              {reservationPanelMessage && <div className="pill ok full-span" >{reservationPanelMessage}</div>}
              {reservationPanelError && <div className="pill danger full-span" >{reservationPanelError}</div>}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isNewModalOpen}
        onClose={closeNewReservationModal}
        title={`신규 예약 등록${selectedMember ? `: ${selectedMember.memberName}` : ""}`}
        size="md"
        footer={
          <>
            <button type="button" className="secondary-button" onClick={closeNewReservationModal}>
              취소
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void handleReservationCreateSubmit()}
              disabled={!selectedMemberId || selectedMemberMembershipsLoading || reservationSchedulesLoading}
            >
              예약 등록
            </button>
          </>
        }
      >
        <div className="stack-md">
          <p className="text-sm text-muted">
            {selectedMember
              ? `${selectedMember.memberName} 회원의 예약 가능 회원권과 수업 일정을 선택합니다.`
              : "먼저 회원을 선택해야 예약을 등록할 수 있습니다."}
          </p>

          {selectedMemberMembershipsError ? (
            <div className="pill danger full-span">{selectedMemberMembershipsError}</div>
          ) : null}
          {reservationSchedulesError ? (
            <div className="pill danger full-span">{reservationSchedulesError}</div>
          ) : null}
          {!selectedMemberMembershipsLoading && selectedMemberId && reservableMemberships.length === 0 ? (
            <div className="pill muted full-span">예약 가능한 회원권이 없습니다.</div>
          ) : null}

          <label className="stack-sm">
            <span className="text-sm">예약 회원권</span>
            <select
              value={reservationCreateForm.membershipId}
              disabled={!selectedMemberId || selectedMemberMembershipsLoading || reservableMemberships.length === 0}
              onChange={(event) =>
                setReservationCreateForm((current) => ({
                  ...current,
                  membershipId: event.target.value
                }))
              }
            >
              <option value="">
                {selectedMemberMembershipsLoading ? "회원권 불러오는 중..." : "회원권 선택"}
              </option>
              {reservableMemberships.map((membership) => (
                <option key={membership.membershipId} value={membership.membershipId}>
                  {membership.productNameSnapshot} (#{membership.membershipId})
                </option>
              ))}
            </select>
          </label>

          <label className="stack-sm">
            <span className="text-sm">수업 일정</span>
            <select
              value={reservationCreateForm.scheduleId}
              disabled={reservationSchedulesLoading || reservationSchedules.length === 0}
              onChange={(event) =>
                setReservationCreateForm((current) => ({
                  ...current,
                  scheduleId: event.target.value
                }))
              }
            >
              <option value="">
                {reservationSchedulesLoading ? "일정 불러오는 중..." : "일정 선택"}
              </option>
              {reservationSchedules.map((schedule) => (
                <option key={schedule.scheduleId} value={schedule.scheduleId}>
                  {schedule.slotTitle} · {schedule.trainerName}
                </option>
              ))}
            </select>
          </label>

          <label className="stack-sm">
            <span className="text-sm">메모</span>
            <textarea
              rows={4}
              value={reservationCreateForm.memo}
              onChange={(event) =>
                setReservationCreateForm((current) => ({
                  ...current,
                  memo: event.target.value
                }))
              }
              placeholder="선택 사항"
            />
          </label>
        </div>
      </Modal>

    </section>
    </section>
  );
}
