import { useCallback, useEffect, useMemo, useState } from "react";

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
      setReservationCreateForm({ membershipId: "", scheduleId: "", memo: "" });
      setReservationPanelMessage(`예약 #${reservation.reservationId}이(가) 생성되었습니다.`);
      setIsNewModalOpen(false);
    } catch (error) {
      setReservationPanelError(error instanceof Error ? error.message : "예약 생성에 실패했습니다.");
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
      setReservationPanelError(error instanceof Error ? error.message : `${actionLabel} 처리 실패.`);
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
          <span className="ops-stat-card__hint">예약 디렉터리에서 확인할 수 있는 회원 수</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">선택된 회원</span>
          <span className="ops-stat-card__value">{selectedMember ? `#${selectedMember.memberId}` : "-"}</span>
          <span className="ops-stat-card__hint">{selectedMember?.memberName ?? "선택된 회원이 없습니다"}</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">현재 예약</span>
          <span className="ops-stat-card__value">{selectedMemberReservations.length}</span>
          <span className="ops-stat-card__hint">현재 워크벤치에 로드된 예약 수</span>
        </div>
      </div>

    <section className="ops-split-grid">
      
      {/* DIRECTORY PANEL */}
      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">예약 디렉터리</h2>
            <p className="ops-section__subtitle">회원을 찾아 예약 워크벤치로 고정합니다.</p>
          </div>
        </div>

        <form
          className="context-fallback-toolbar"
          style={{ marginBottom: '24px' }}
          onSubmit={(event) => {
            event.preventDefault();
            void loadReservationTargets(reservationTargetsKeyword);
          }}
        >
          <label className="stack-sm">
            <span className="text-xs text-muted" style={{ fontWeight: 600 }}>회원 검색</span>
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
                <th style={{ textAlign: 'center' }}>예약 수</th>
                <th style={{ textAlign: 'right' }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {targetsPagination.pagedItems.length === 0 ? (
                <tr><td colSpan={3} className="empty-cell" style={{ padding: '32px' }}>조건에 맞는 회원이 없습니다.</td></tr>
              ) : (
                targetsPagination.pagedItems.map((target) => (
                  <tr key={target.memberId} className={selectedMember?.memberId === target.memberId ? "is-selected-row" : undefined}>
                    <td>
                      <div className="stack-sm">
                        <span style={{ fontWeight: 600 }}>{target.memberName}</span>
                        <span className="text-xs text-muted">{target.phone}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="pill info" style={{ fontSize: '11px' }}>{target.confirmedReservationCount}개</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={selectedMember?.memberId === target.memberId ? "primary-button" : "secondary-button"}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        disabled={selectedMemberLoading}
                        onClick={() => void selectMember(target.memberId)}
                      >
                        {selectedMember?.memberId === target.memberId ? "선택 중" : "선택"}
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
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h2 className="brand-title" style={{ fontSize: '1.25rem' }}>예약 워크벤치</h2>
            <p className="text-muted text-xs">선택된 회원의 예약 액션과 이력을 확인합니다.</p>
          </div>
          {selectedMember && (
            <button 
              type="button" 
              className="primary-button"
              onClick={() => setIsNewModalOpen(true)}
            >
              신규 예약
            </button>
          )}
        </header>

        {!selectedMember ? (
          <div className="ops-empty">
            디렉터리에서 회원을 선택하여 예약 작업을 시작하세요.
          </div>
        ) : (
          <div className="stack-lg">


            <section>
              <div className="ops-section__header">
                <div>
                  <h3 className="ops-section__title">현재 예약</h3>
                  <p className="ops-section__subtitle">선택된 회원의 확정, 출석, 취소, 노쇼 이력을 확인합니다.</p>
                </div>
              </div>
              <div className="table-shell">
                <table className="members-table">
                  <thead>
                    <tr>
                      <th>예약 시간</th>
                      <th>상태</th>
                      <th style={{ textAlign: 'right' }}>액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservationsPagination.pagedItems.length === 0 ? (
                      <tr><td colSpan={3} className="empty-cell" style={{ padding: '32px' }}>예약 내역이 없습니다.</td></tr>
                    ) : (
                      reservationsPagination.pagedItems.map((reservation) => {
                        const statusInfo = statusMap[reservation.reservationStatus] || { label: reservation.reservationStatus, class: 'pill muted' };
                        const canMutate = reservation.reservationStatus === "CONFIRMED";
                        const canCheckIn = canMutate && !reservation.checkedInAt;

                        return (
                          <tr key={reservation.reservationId}>
                            <td>
                              <div className="stack-sm">
                                <span className="text-sm" style={{ fontWeight: 600 }}>{formatDateTime(reservation.reservedAt)}</span>
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
                                  CheckIn
                                </button>
                                <button 
                                  type="button" 
                                  className="secondary-button ops-action-button"
                                  disabled={!canMutate}
                                  onClick={() => mutateReservation(reservation.reservationId, "완료 처리", () => completeReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canMutate, "확정된 예약만 완료 처리할 수 있습니다.")}
                                >
                                  Done
                                </button>
                                <button 
                                  type="button" 
                                  className="secondary-button ops-action-button"
                                  style={{ color: 'var(--status-danger)' }}
                                  disabled={!canMutate}
                                  onClick={() => mutateReservation(reservation.reservationId, "예약 취소", () => cancelReservation(selectedMemberId!, reservation.reservationId).then(()=>undefined), canMutate, "확정된 예약만 취소할 수 있습니다.")}
                                >
                                  Void
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
            </section>
          </div>
        )}

        {(reservationPanelMessage || reservationPanelError) && (
          <div className="mt-md">
            {reservationPanelMessage && <div className="pill ok full-span" >{reservationPanelMessage}</div>}
            {reservationPanelError && <div className="pill danger full-span" >{reservationPanelError}</div>}
          </div>
        )}

        <Modal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          title="Create 신규 예약"
          footer={
            <>
              <button type="button" className="secondary-button" onClick={() => setIsNewModalOpen(false)}>취소</button>
              <button 
                type="button" 
                className="primary-button"
                disabled={!reservationCreateForm.membershipId || !reservationCreateForm.scheduleId}
                onClick={handleReservationCreateSubmit}
              >
                예약 확정
              </button>
            </>
          }
        >
          <div className="stack-md">
            <label className="stack-sm">
                <span className="text-sm">대상 회원권</span>
                <select
                  className="input"
                  value={reservationCreateForm.membershipId}
                  onChange={(event) =>
                    setReservationCreateForm((prev) => ({ ...prev, membershipId: event.target.value }))
                  }
                >
                  <option value="">-- 유효한 회원권 선택 --</option>
                  {reservableMemberships.map((membership) => (
                    <option key={membership.membershipId} value={membership.membershipId}>
                      #{membership.membershipId} · {membership.productNameSnapshot}
                    </option>
                  ))}
                </select>
                {reservableMemberships.length === 0 && (
                  <span className="text-xs text-danger">이 회원에게 유효한 회원권이 없습니다.</span>
                )}
              </label>
              
              <label className="stack-sm">
                <span className="text-sm">수업 일정</span>
                <select
                  className="input"
                  value={reservationCreateForm.scheduleId}
                  onChange={(event) =>
                    setReservationCreateForm((prev) => ({ ...prev, scheduleId: event.target.value }))
                  }
                >
                  <option value="">-- 수업 일정 선택 --</option>
                  {reservationSchedules.map((schedule) => (
                    <option key={schedule.scheduleId} value={schedule.scheduleId}>
                      {schedule.slotTitle} ({schedule.trainerName}) · {formatDate(schedule.startAt)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="stack-sm">
                <span className="text-sm">내부 메모</span>
                <textarea
                  className="input"
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  placeholder="운영 메모를 입력하세요"
                  value={reservationCreateForm.memo}
                  onChange={(event) => setReservationCreateForm((prev) => ({ ...prev, memo: event.target.value }))}
                />
              </label>
          </div>
        </Modal>
      </article>
    </section>
    </section>
  );
}
