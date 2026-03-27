import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuthState } from "../../app/auth";
import { hasRole } from "../../app/roles";
import { ApiClientError } from "../../api/client";
import { useDebouncedValue } from "../../shared/hooks/useDebouncedValue";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { todayLocalDate } from "../../shared/date";
import { useSelectedMemberMembershipsQuery } from "../member-context/modules/useSelectedMemberMembershipsQuery";

import { useSelectedMemberStore } from "../members/modules/SelectedMemberContext";
import type { PurchasedMembership, ReservationRow } from "../members/modules/types";
import { isMembershipReservableOn } from "./modules/reservableMemberships";
import { usePtReservationCandidatesQuery } from "./modules/usePtReservationCandidatesQuery";
import { useReservationSchedulesQuery } from "./modules/useReservationSchedulesQuery";
import { useReservationTargetsQuery } from "./modules/useReservationTargetsQuery";
import { useSelectedMemberReservationsState } from "./modules/useSelectedMemberReservationsState";
import { Modal } from "../../shared/ui/Modal";
import { createDefaultTrainerFilters } from "../trainers/modules/types";
import { useTrainersQuery } from "../trainers/modules/useTrainersQuery";

import styles from "./ReservationsPage.module.css";


type ReservationCreateForm = {
  membershipId: string;
  scheduleId: string;
  trainerUserId: string;
  reservationDate: string;
  ptCandidateStartAt: string;
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

function createEmptyReservationCreateForm(businessDateText: string): ReservationCreateForm {
  return {
    membershipId: "",
    scheduleId: "",
    trainerUserId: "",
    reservationDate: businessDateText,
    ptCandidateStartAt: "",
    memo: "",
  };
}

function getMembershipReservationKind(membership: Pick<PurchasedMembership, "productCategorySnapshot"> | null | undefined) {
  return membership?.productCategorySnapshot === "PT" ? "PT" : "GX";
}

function describeMembershipOption(membership: PurchasedMembership) {
  const reservationKind = getMembershipReservationKind(membership);
  const remainingText = membership.productTypeSnapshot === "COUNT"
    ? `잔여 ${membership.remainingCount ?? 0}회`
    : membership.endDate
      ? `${membership.endDate}까지`
      : "기간형";
  return `${reservationKind} · ${membership.productNameSnapshot} (${remainingText})`;
}

export default function ReservationsPage() {
  const { authUser } = useAuthState();
  const { selectedMember, selectedMemberId, selectMember, selectedMemberLoading } = useSelectedMemberStore();
  const isTrainerActor = hasRole(authUser, "ROLE_TRAINER");
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
    trainers,
    trainersLoading,
    trainersQueryError,
    loadTrainers,
    resetTrainersQuery,
  } = useTrainersQuery({
    getDefaultFilters: () => ({
      ...createDefaultTrainerFilters(authUser?.centerId ?? 1),
      status: "ACTIVE",
    }),
  });
  const {
    ptReservationCandidates,
    ptReservationCandidatesLoading,
    ptReservationCandidatesError,
    loadPtReservationCandidates,
    resetPtReservationCandidatesQuery,
  } = usePtReservationCandidatesQuery();
  const {
    selectedMemberReservations,
    loadSelectedMemberReservations,
    resetSelectedMemberReservationsState,
    createReservation,
    createPtReservation,
    checkInReservation,
    completeReservation,
    cancelReservation,
  } = useSelectedMemberReservationsState();

  const businessDateText = todayLocalDate();
  const [reservationCreateForm, setReservationCreateForm] = useState<ReservationCreateForm>(
    () => createEmptyReservationCreateForm(businessDateText)
  );
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

  const reservableMemberships = selectedMemberMemberships.filter((membership) =>
    isMembershipReservableOn(membership, businessDateText)
  );
  const selectedCreateMembership = useMemo(
    () => reservableMemberships.find((membership) => membership.membershipId === Number(reservationCreateForm.membershipId)) ?? null,
    [reservationCreateForm.membershipId, reservableMemberships],
  );
  const selectedCreateMode = getMembershipReservationKind(selectedCreateMembership);
  const gxReservationSchedules = useMemo(
    () => reservationSchedules.filter((schedule) => schedule.scheduleType === "GX"),
    [reservationSchedules],
  );
  const trainerOptions = useMemo(() => {
    if (isTrainerActor && authUser) {
      return [{
        userId: authUser.userId,
        displayName: authUser.username,
      }];
    }
    return trainers.map((trainer) => ({
      userId: trainer.userId,
      displayName: trainer.displayName,
    }));
  }, [authUser, isTrainerActor, trainers]);
  const selectedTrainerOption = useMemo(
    () => trainerOptions.find((trainer) => String(trainer.userId) === reservationCreateForm.trainerUserId) ?? null,
    [reservationCreateForm.trainerUserId, trainerOptions],
  );
  const canSubmitReservation = useMemo(() => {
    if (!selectedMemberId || !selectedCreateMembership || selectedMemberMembershipsLoading) {
      return false;
    }
    if (selectedCreateMode === "PT") {
      return Boolean(
        reservationCreateForm.trainerUserId &&
        reservationCreateForm.reservationDate &&
        reservationCreateForm.ptCandidateStartAt &&
        !ptReservationCandidatesLoading,
      );
    }
    return Boolean(
      reservationCreateForm.scheduleId &&
      !reservationSchedulesLoading,
    );
  }, [
    ptReservationCandidatesLoading,
    reservationCreateForm.ptCandidateStartAt,
    reservationCreateForm.reservationDate,
    reservationCreateForm.scheduleId,
    reservationCreateForm.trainerUserId,
    reservationSchedulesLoading,
    selectedCreateMembership,
    selectedCreateMode,
    selectedMemberId,
    selectedMemberMembershipsLoading,
  ]);
  const reservationModeDescription = selectedCreateMode === "PT"
    ? "PT는 트레이너 가능 시간에서 60분 블록으로 예약합니다."
    : "GX는 미리 등록된 수업 슬롯에 배정합니다.";
  const trainerFieldHint = selectedCreateMode !== "PT"
    ? null
    : isTrainerActor
      ? "트레이너 계정은 본인 availability 안에서만 PT 예약을 생성할 수 있습니다."
      : selectedCreateMembership?.assignedTrainerId == null
        ? "이 회원권에는 담당 트레이너가 지정되지 않았습니다. 예약할 트레이너를 직접 선택해야 합니다."
        : selectedTrainerOption
          ? `담당 트레이너 기본값: ${selectedTrainerOption.displayName}`
          : "담당 트레이너를 불러오는 중입니다.";

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
      resetPtReservationCandidatesQuery();
      setReservationCreateForm(createEmptyReservationCreateForm(businessDateText));
      setReservationPanelMessage(null);
      setReservationPanelError(null);
      return;
    }

    void loadSelectedMemberMemberships(selectedMemberId);
    void loadSelectedMemberReservations(selectedMemberId);
    resetPtReservationCandidatesQuery();
    setReservationCreateForm(createEmptyReservationCreateForm(businessDateText));
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, [
    businessDateText,
    loadSelectedMemberMemberships,
    loadSelectedMemberReservations,
    resetSelectedMemberMembershipsQuery,
    resetPtReservationCandidatesQuery,
    resetSelectedMemberReservationsState,
    selectedMemberId
  ]);

  const clearPanelFeedback = useCallback(() => {
    setReservationPanelMessage(null);
    setReservationPanelError(null);
  }, []);

  const resetCreateForm = useCallback(() => {
    resetPtReservationCandidatesQuery();
    setReservationCreateForm(createEmptyReservationCreateForm(todayLocalDate()));
  }, [resetPtReservationCandidatesQuery]);

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
    const membership = reservableMemberships.find((item) => item.membershipId === membershipId);
    if (!membership) {
      setReservationPanelError("예약 회원권을 선택해 주세요.");
      return;
    }
    if (selectedCreateMode === "PT") {
      if (!reservationCreateForm.trainerUserId || !reservationCreateForm.ptCandidateStartAt) {
        setReservationPanelError("담당 트레이너와 가능한 PT 시간을 선택해 주세요.");
        return;
      }
    } else if (!reservationCreateForm.scheduleId) {
      setReservationPanelError("수업 일정을 선택해 주세요.");
      return;
    }

    try {
      const reservation = selectedCreateMode === "PT"
        ? await createPtReservation({
            memberId: selectedMemberId,
            membershipId,
            trainerUserId: Number(reservationCreateForm.trainerUserId),
            startAt: reservationCreateForm.ptCandidateStartAt,
            memo: reservationCreateForm.memo,
          })
        : await createReservation({
            memberId: selectedMemberId,
            membershipId,
            scheduleId: Number(reservationCreateForm.scheduleId),
            memo: reservationCreateForm.memo,
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

  useEffect(() => {
    if (!isNewModalOpen || selectedCreateMode !== "PT" || isTrainerActor) {
      if (!isNewModalOpen) {
        resetTrainersQuery();
      }
      return;
    }
    void loadTrainers();
  }, [isNewModalOpen, isTrainerActor, loadTrainers, resetTrainersQuery, selectedCreateMode]);

  useEffect(() => {
    if (!selectedCreateMembership) {
      return;
    }
    if (selectedCreateMode === "PT") {
      const nextTrainerUserId = isTrainerActor
        ? String(authUser?.userId ?? "")
        : selectedCreateMembership.assignedTrainerId
          ? String(selectedCreateMembership.assignedTrainerId)
          : reservationCreateForm.trainerUserId;
      setReservationCreateForm((current) => {
        const nextReservationDate = current.reservationDate || todayLocalDate();
        if (
          current.scheduleId === "" &&
          current.trainerUserId === nextTrainerUserId &&
          current.reservationDate === nextReservationDate &&
          current.ptCandidateStartAt === ""
        ) {
          return current;
        }
        return {
          ...current,
          scheduleId: "",
          trainerUserId: nextTrainerUserId,
          reservationDate: nextReservationDate,
          ptCandidateStartAt: "",
        };
      });
      return;
    }
    setReservationCreateForm((current) => {
      if (current.trainerUserId === "" && current.ptCandidateStartAt === "") {
        return current;
      }
      return {
        ...current,
        trainerUserId: "",
        ptCandidateStartAt: "",
      };
    });
  }, [
    authUser?.userId,
    isTrainerActor,
    reservationCreateForm.trainerUserId,
    selectedCreateMembership,
    selectedCreateMode,
  ]);

  useEffect(() => {
    if (
      !isNewModalOpen ||
      selectedCreateMode !== "PT" ||
      !selectedCreateMembership ||
      !reservationCreateForm.trainerUserId ||
      !reservationCreateForm.reservationDate
    ) {
      resetPtReservationCandidatesQuery();
      return;
    }
    void loadPtReservationCandidates({
      membershipId: selectedCreateMembership.membershipId,
      trainerUserId: Number(reservationCreateForm.trainerUserId),
      date: reservationCreateForm.reservationDate,
    });
  }, [
    isNewModalOpen,
    loadPtReservationCandidates,
    reservationCreateForm.reservationDate,
    reservationCreateForm.trainerUserId,
    resetPtReservationCandidatesQuery,
    selectedCreateMembership,
    selectedCreateMode,
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
              disabled={!canSubmitReservation}
            >
              예약 등록
            </button>
          </>
        }
      >
        <div className="stack-md">
          <p className="text-sm text-muted">
            {selectedMember
              ? `${selectedMember.memberName} 회원의 예약 가능 회원권을 선택한 뒤 ${selectedCreateMode === "PT" ? "트레이너와 가능 시간을" : "수업 일정을"} 지정합니다.`
              : "먼저 회원을 선택해야 예약을 등록할 수 있습니다."}
          </p>
          <div className="pill info full-span">{reservationModeDescription}</div>

          {selectedMemberMembershipsError ? (
            <div className="pill danger full-span">{selectedMemberMembershipsError}</div>
          ) : null}
          {reservationSchedulesError && selectedCreateMode !== "PT" ? (
            <div className="pill danger full-span">{reservationSchedulesError}</div>
          ) : null}
          {trainersQueryError && selectedCreateMode === "PT" ? (
            <div className="pill danger full-span">{trainersQueryError}</div>
          ) : null}
          {ptReservationCandidatesError && selectedCreateMode === "PT" ? (
            <div className="pill danger full-span">{ptReservationCandidatesError}</div>
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
                  membershipId: event.target.value,
                  scheduleId: "",
                  trainerUserId: "",
                  ptCandidateStartAt: "",
                }))
              }
            >
              <option value="">
                {selectedMemberMembershipsLoading ? "회원권 불러오는 중..." : "회원권 선택"}
              </option>
              {reservableMemberships.map((membership) => (
                <option key={membership.membershipId} value={membership.membershipId}>
                  {describeMembershipOption(membership)} · #{membership.membershipId}
                </option>
              ))}
            </select>
            {selectedCreateMembership ? (
              <span className="text-xs text-muted">
                {selectedCreateMode === "PT"
                  ? "PT 횟수제 회원권은 활성 상태와 잔여 가능 횟수를 다시 검증한 뒤 예약됩니다."
                  : "GX 회원권은 선택한 고정 수업 슬롯 기준으로 예약됩니다."}
              </span>
            ) : null}
          </label>

          <label className="stack-sm">
            <span className="text-sm">{selectedCreateMode === "PT" ? "예약 방식" : "수업 일정"}</span>
            {selectedCreateMode === "PT" ? (
              <div className="pill info full-span">60분 예약 블록, 30분 단위 시작 규칙을 적용합니다.</div>
            ) : (
              <select
                value={reservationCreateForm.scheduleId}
                disabled={reservationSchedulesLoading || gxReservationSchedules.length === 0}
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
                {gxReservationSchedules.map((schedule) => (
                  <option key={schedule.scheduleId} value={schedule.scheduleId}>
                    {schedule.slotTitle} · {schedule.trainerName}
                  </option>
                ))}
              </select>
            )}
            {selectedCreateMode !== "PT" ? (
              <span className="text-xs text-muted">GX는 이미 운영 중인 확정 수업 슬롯만 선택할 수 있습니다.</span>
            ) : null}
          </label>

          {selectedCreateMode === "PT" ? (
            <>
              <label className="stack-sm">
                <span className="text-sm">담당 트레이너</span>
                <select
                  value={reservationCreateForm.trainerUserId}
                  disabled={isTrainerActor || trainersLoading || trainerOptions.length === 0}
                  onChange={(event) =>
                    setReservationCreateForm((current) => ({
                      ...current,
                      trainerUserId: event.target.value,
                      ptCandidateStartAt: "",
                    }))
                  }
                >
                  <option value="">
                    {isTrainerActor
                      ? "본인 일정으로 예약"
                      : trainersLoading
                        ? "트레이너 불러오는 중..."
                        : "트레이너 선택"}
                  </option>
                  {trainerOptions.map((trainer) => (
                    <option key={trainer.userId} value={trainer.userId}>
                      {trainer.displayName}
                    </option>
                  ))}
                </select>
                {trainerFieldHint ? (
                  <span className="text-xs text-muted">{trainerFieldHint}</span>
                ) : null}
              </label>

              <label className="stack-sm">
                <span className="text-sm">예약 날짜</span>
                <input
                  className="input"
                  type="date"
                  value={reservationCreateForm.reservationDate}
                  min={businessDateText}
                  onChange={(event) =>
                    setReservationCreateForm((current) => ({
                      ...current,
                      reservationDate: event.target.value,
                      ptCandidateStartAt: "",
                    }))
                  }
                />
                <span className="text-xs text-muted">과거 날짜는 선택할 수 없으며, 선택한 날짜 기준으로 가능한 시작 시각을 다시 계산합니다.</span>
              </label>

              <label className="stack-sm">
                <span className="text-sm">가능 시간</span>
                <select
                  value={reservationCreateForm.ptCandidateStartAt}
                  disabled={
                    ptReservationCandidatesLoading ||
                    !reservationCreateForm.trainerUserId ||
                    (ptReservationCandidates?.items.length ?? 0) === 0
                  }
                  onChange={(event) =>
                    setReservationCreateForm((current) => ({
                      ...current,
                      ptCandidateStartAt: event.target.value,
                    }))
                  }
                >
                  <option value="">
                    {ptReservationCandidatesLoading
                      ? "가능 시간 계산 중..."
                      : "가능 시간 선택"}
                  </option>
                  {(ptReservationCandidates?.items ?? []).map((candidate) => (
                    <option key={candidate.startAt} value={candidate.startAt}>
                      {formatDateTime(candidate.startAt)} ~ {new Date(candidate.endAt).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </option>
                  ))}
                </select>
                {reservationCreateForm.ptCandidateStartAt ? (
                  <span className="text-xs text-muted">
                    선택한 PT 시간: {formatDateTime(reservationCreateForm.ptCandidateStartAt)}
                  </span>
                ) : null}
                {!ptReservationCandidatesLoading && (ptReservationCandidates?.items.length ?? 0) === 0 ? (
                  <span className="text-xs text-muted">선택한 날짜에 가능한 PT 시간이 없습니다.</span>
                ) : null}
              </label>
            </>
          ) : null}

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
