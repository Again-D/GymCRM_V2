import { useEffect, useState } from "react";

import { apiGet, apiPatch, apiPost, isMockApiMode } from "../../api/client";
import { invalidateQueryDomains } from "../../api/queryInvalidation";
import { useAuthState } from "../../app/auth";
import { hasAnyRole, hasRole } from "../../app/roles";
import { usePagination } from "../../shared/hooks/usePagination";
import { Modal } from "../../shared/ui/Modal";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { TrainerAvailabilityMonthView } from "../trainer-availability/TrainerAvailabilityMonthView";
import {
  formatAvailabilityTimeRange,
  getAvailabilityStatusLabel,
  getCurrentMonthValue,
} from "../trainer-availability/modules/types";
import { useTrainerAvailabilityQuery } from "../trainer-availability/modules/useTrainerAvailabilityQuery";
import {
  createDefaultTrainerFilters,
  createEmptyTrainerForm,
  createTrainerFormFromDetail,
  type TrainerDetail,
} from "./modules/types";
import { useTrainersQuery } from "./modules/useTrainersQuery";

import styles from "./TrainersPage.module.css";

function asNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function TrainersPage() {
  const { authUser, isMockMode } = useAuthState();
  const defaultCenterId = authUser?.centerId ?? 1;
  const canReadLiveTrainers =
    isMockMode ||
    hasAnyRole(authUser, ["ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN", "ROLE_DESK"]);
  const isSuperAdmin = hasRole(authUser, "ROLE_SUPER_ADMIN");
  const canMutateTrainers =
    isMockMode ||
    hasAnyRole(authUser, ["ROLE_SUPER_ADMIN", "ROLE_CENTER_ADMIN"]);

  const [trainerFilters, setTrainerFilters] = useState(() =>
    createDefaultTrainerFilters(defaultCenterId),
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<TrainerDetail | null>(null);
  const [availabilityMonth, setAvailabilityMonth] = useState(getCurrentMonthValue);
  const [trainerFormOpen, setTrainerFormOpen] = useState(false);
  const [trainerFormMode, setTrainerFormMode] = useState<"create" | "edit">("create");
  const [trainerForm, setTrainerForm] = useState(() =>
    createEmptyTrainerForm(defaultCenterId),
  );
  const [trainerFormSubmitting, setTrainerFormSubmitting] = useState(false);
  const [trainerPanelMessage, setTrainerPanelMessage] = useState<string | null>(null);
  const [trainerPanelError, setTrainerPanelError] = useState<string | null>(null);
  const [trainerFormError, setTrainerFormError] = useState<string | null>(null);

  const { trainers, trainersLoading, trainersQueryError, loadTrainers, resetTrainersQuery } =
    useTrainersQuery({
      getDefaultFilters: () => trainerFilters,
    });
  const {
    snapshot: trainerAvailabilitySnapshot,
    loading: trainerAvailabilityLoading,
    error: trainerAvailabilityError,
    loadSnapshot: loadTrainerAvailability,
    reset: resetTrainerAvailability,
  } = useTrainerAvailabilityQuery();

  const pagination = usePagination(trainers, {
    initialPageSize: 10,
    resetDeps: [trainers.length, trainerFilters.centerId, trainerFilters.keyword, trainerFilters.status],
  });

  useEffect(() => {
    if (!canReadLiveTrainers) {
      resetTrainersQuery();
      return;
    }
    void loadTrainers(trainerFilters);
    return () => {
      resetTrainersQuery();
    };
  }, [canReadLiveTrainers, loadTrainers, resetTrainersQuery, trainerFilters]);

  useEffect(() => {
    if (!canMutateTrainers && trainerFormOpen) {
      setTrainerFormOpen(false);
    }
  }, [canMutateTrainers, trainerFormOpen]);

  useEffect(() => {
    if (isSuperAdmin) {
      return;
    }
    setTrainerFilters((current) =>
      current.centerId === defaultCenterId
        ? current
        : { ...current, centerId: defaultCenterId },
    );
    setTrainerForm((current) =>
      current.centerId === defaultCenterId
        ? current
        : { ...current, centerId: defaultCenterId },
    );
  }, [defaultCenterId, isSuperAdmin]);

  useEffect(() => {
    if (!detailOpen || !selectedTrainer) {
      resetTrainerAvailability();
      return;
    }
    void loadTrainerAvailabilitySnapshot(selectedTrainer.userId, availabilityMonth);
  }, [
    availabilityMonth,
    detailOpen,
    loadTrainerAvailability,
    resetTrainerAvailability,
    selectedTrainer,
  ]);

  function clearFeedback() {
    setTrainerPanelMessage(null);
    setTrainerPanelError(null);
    setTrainerFormError(null);
  }

  async function loadTrainerAvailabilitySnapshot(userId: number, month: string) {
    return loadTrainerAvailability({ type: "trainer", trainerUserId: userId }, month);
  }

  async function loadTrainerDetail(userId: number) {
    clearFeedback();
    setDetailLoading(true);
    try {
      if (isMockApiMode()) {
        const { getMockTrainerDetail } = await import("../../api/mockData");
        const detail = getMockTrainerDetail(userId);
        if (!detail) {
          throw new Error("트레이너 상세를 찾을 수 없습니다.");
        }
        setSelectedTrainer(detail);
      } else {
        const response = await apiGet<TrainerDetail>(`/api/v1/trainers/${userId}`);
        setSelectedTrainer(response.data);
      }
      setDetailOpen(true);
    } catch (error) {
      setTrainerPanelError(
        error instanceof Error ? error.message : "트레이너 상세를 불러오지 못했습니다.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function startCreateTrainer() {
    clearFeedback();
    setTrainerFormMode("create");
    setTrainerForm(createEmptyTrainerForm(defaultCenterId));
    setTrainerFormOpen(true);
  }

  async function startEditTrainer(userId: number) {
    clearFeedback();
    setDetailLoading(true);
    try {
      let detail: TrainerDetail | null = null;
      if (isMockApiMode()) {
        const { getMockTrainerDetail } = await import("../../api/mockData");
        detail = getMockTrainerDetail(userId);
      } else {
        const response = await apiGet<TrainerDetail>(`/api/v1/trainers/${userId}`);
        detail = response.data;
      }
      if (!detail) {
        throw new Error("트레이너 상세를 찾을 수 없습니다.");
      }
      setSelectedTrainer(detail);
      setTrainerFormMode("edit");
      setTrainerForm(createTrainerFormFromDetail(detail));
      setTrainerFormOpen(true);
    } catch (error) {
      setTrainerPanelError(
        error instanceof Error ? error.message : "트레이너 상세를 불러오지 못했습니다.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitTrainerForm() {
    clearFeedback();
    const loginId = trainerForm.loginId.trim();
    const displayName = trainerForm.displayName.trim();

    if (!loginId) {
      setTrainerFormError("로그인 ID를 입력해야 합니다.");
      return;
    }
    if (!displayName) {
      setTrainerFormError("트레이너 이름을 입력해야 합니다.");
      return;
    }
    if (trainerFormMode === "create" && !trainerForm.password.trim()) {
      setTrainerFormError("초기 비밀번호를 입력해야 합니다.");
      return;
    }

    setTrainerFormSubmitting(true);
    try {
      let detail: TrainerDetail | null = null;
      if (isMockApiMode()) {
        if (trainerFormMode === "create") {
          const { createMockTrainer } = await import("../../api/mockData");
          detail = createMockTrainer({
            centerId: trainerForm.centerId,
            loginId,
            password: trainerForm.password,
            displayName,
            phone: asNullableText(trainerForm.phone),
          });
          setTrainerPanelMessage("트레이너 계정을 등록했습니다.");
        } else {
          const { updateMockTrainer } = await import("../../api/mockData");
          detail = selectedTrainer
            ? updateMockTrainer(selectedTrainer.userId, {
                loginId,
                displayName,
                phone: asNullableText(trainerForm.phone),
              })
            : null;
          setTrainerPanelMessage("트레이너 정보를 수정했습니다.");
        }
      } else if (trainerFormMode === "create") {
        const response = await apiPost<TrainerDetail>("/api/v1/trainers", {
          centerId: trainerForm.centerId,
          loginId,
          password: trainerForm.password,
          displayName,
          phone: asNullableText(trainerForm.phone),
        });
        detail = response.data;
        setTrainerPanelMessage(response.message);
      } else {
        const response = await apiPatch<TrainerDetail>(
          `/api/v1/trainers/${selectedTrainer?.userId}`,
          {
            loginId,
            displayName,
            phone: asNullableText(trainerForm.phone),
          },
        );
        detail = response.data;
        setTrainerPanelMessage(response.message);
      }

      if (!detail) {
        throw new Error("트레이너 정보를 저장하지 못했습니다.");
      }

      setSelectedTrainer(detail);
      setTrainerForm(createTrainerFormFromDetail(detail));
      setTrainerFormOpen(false);
      invalidateQueryDomains(["trainers"]);
      await loadTrainers(trainerFilters);
    } catch (error) {
      setTrainerFormError(
        error instanceof Error ? error.message : "트레이너 정보를 저장하지 못했습니다.",
      );
    } finally {
      setTrainerFormSubmitting(false);
    }
  }

  async function toggleTrainerStatus(userId: number, nextStatus: "ACTIVE" | "INACTIVE") {
    clearFeedback();
    try {
      let detail: TrainerDetail | null = null;
      if (isMockApiMode()) {
        const { updateMockTrainerStatus } = await import("../../api/mockData");
        detail = updateMockTrainerStatus(userId, nextStatus);
      } else {
        const response = await apiPatch<TrainerDetail>(
          `/api/v1/trainers/${userId}/status`,
          { userStatus: nextStatus },
        );
        detail = response.data;
        setTrainerPanelMessage(response.message);
      }
      if (!detail) {
        throw new Error("트레이너 상태를 변경하지 못했습니다.");
      }
      if (selectedTrainer?.userId === userId) {
        setSelectedTrainer(detail);
      }
      if (isMockApiMode()) {
        setTrainerPanelMessage(
          nextStatus === "ACTIVE"
            ? "트레이너 계정을 활성화했습니다."
            : "트레이너 계정을 비활성화했습니다.",
        );
      }
      invalidateQueryDomains(["trainers"]);
      await loadTrainers(trainerFilters);
    } catch (error) {
      setTrainerPanelError(
        error instanceof Error ? error.message : "트레이너 상태를 변경하지 못했습니다.",
      );
    }
  }

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">현장 운영 계정</span>
          <h1 className="ops-title">트레이너 관리</h1>
          <p className="ops-subtitle">
            트레이너 계정 상태와 담당 회원 수, 오늘 예약 현황을 한 화면에서 확인합니다.
          </p>
          <div className="ops-meta">
            <span className="ops-meta__pill">계정 운영</span>
            <span className="ops-meta__pill">담당 현황</span>
            <span className="ops-meta__pill">데스크 조회 전용</span>
          </div>
        </div>
        {canMutateTrainers ? (
          <button type="button" className="primary-button" onClick={startCreateTrainer}>
            트레이너 등록
          </button>
        ) : null}
      </div>

      <div className="ops-stat-strip">
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">조회 결과</span>
          <span className="ops-stat-card__value">{trainers.length}</span>
          <span className="ops-stat-card__hint">현재 센터 기준 트레이너 계정 수</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">활성 트레이너</span>
          <span className="ops-stat-card__value">
            {trainers.filter((trainer) => trainer.userStatus === "ACTIVE").length}
          </span>
          <span className="ops-stat-card__hint">새 배정에 사용할 수 있는 활성 계정</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">오늘 확정 예약</span>
          <span className="ops-stat-card__value">
            {trainers.reduce(
              (sum, trainer) => sum + trainer.todayConfirmedReservationCount,
              0,
            )}
          </span>
          <span className="ops-stat-card__hint">현재 목록 기준 오늘 `CONFIRMED` 예약 합계</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">운영 권한</span>
          <span className="ops-stat-card__value">
            {canMutateTrainers ? "편집 가능" : "조회 전용"}
          </span>
          <span className="ops-stat-card__hint">
            {canMutateTrainers
              ? "트레이너 계정 생성과 상태 변경이 가능합니다."
              : "데스크 모드에서는 운영 정보만 조회할 수 있습니다."}
          </span>
        </div>
      </div>

      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">트레이너 디렉터리</h2>
            <p className="ops-section__subtitle">
              이름, 상태, 연락처, 담당 회원 수, 오늘 예약 수를 기준으로 운영 상태를 확인합니다.
            </p>
          </div>
        </div>

        {!canMutateTrainers && canReadLiveTrainers ? (
          <div className={`field-ops-note field-ops-note--restricted ${styles.readOnlyBanner}`}>
            <span className="field-ops-note__label">조회 전용 모드</span>
            <div className="text-sm brand-title mt-xs">
              데스크 권한에서는 상세 조회만 가능하며 계정 생성, 수정, 상태 변경은 숨겨집니다.
            </div>
          </div>
        ) : null}

        {!canReadLiveTrainers ? (
          <div className="field-ops-note field-ops-note--restricted">
            <span className="field-ops-note__label">운영 권한 제한</span>
            <div className="text-sm brand-title mt-xs">
              현재 권한에서는 트레이너 관리 화면에 접근할 수 없습니다.
            </div>
          </div>
        ) : null}

        {(trainerPanelMessage || trainerPanelError || trainersQueryError) && (
          <div className="ops-feedback-stack mb-md">
            {trainerPanelMessage ? (
              <div className="pill ok full-span">{trainerPanelMessage}</div>
            ) : null}
            {trainerPanelError || trainersQueryError ? (
              <div className="pill danger full-span">
                {trainerPanelError ?? trainersQueryError}
              </div>
            ) : null}
          </div>
        )}

        <div className={styles.filterGrid}>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">검색어</span>
            <input
              className="input"
              value={trainerFilters.keyword}
              onChange={(event) =>
                setTrainerFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                }))
              }
              placeholder="이름 / 로그인 ID / 연락처"
            />
          </label>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">상태</span>
            <select
              className="input"
              value={trainerFilters.status}
              onChange={(event) =>
                setTrainerFilters((current) => ({
                  ...current,
                  status: event.target.value as "ACTIVE" | "INACTIVE" | "",
                }))
              }
            >
              <option value="">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </label>
          {isSuperAdmin ? (
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">센터 ID</span>
              <input
                className="input"
                type="number"
                min={1}
                value={trainerFilters.centerId}
                onChange={(event) =>
                  setTrainerFilters((current) => ({
                    ...current,
                    centerId: Number(event.target.value || "1"),
                  }))
                }
              />
            </label>
          ) : null}
          <div className={styles.filterActions}>
            <button
              type="button"
              className="secondary-button"
              disabled={!canReadLiveTrainers}
              onClick={() => {
                const nextFilters = createDefaultTrainerFilters(defaultCenterId);
                setTrainerFilters(nextFilters);
                void loadTrainers(nextFilters);
              }}
            >
              초기화
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={trainersLoading || !canReadLiveTrainers}
              onClick={() => void loadTrainers(trainerFilters)}
            >
              {trainersLoading ? "불러오는 중..." : "적용"}
            </button>
          </div>
        </div>

        <div className="table-shell mt-lg">
          <table className="members-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>상태</th>
                <th>연락처</th>
                <th>담당 회원</th>
                <th>오늘 예약</th>
                <th className="ops-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {canReadLiveTrainers
                      ? "조건에 맞는 트레이너가 없습니다."
                      : "현재 권한에서는 트레이너 정보를 조회할 수 없습니다."}
                  </td>
                </tr>
              ) : (
                pagination.pagedItems.map((trainer) => (
                  <tr key={trainer.userId}>
                    <td>
                      <strong>{trainer.displayName}</strong>
                    </td>
                    <td>
                      <span
                        className={
                          trainer.userStatus === "ACTIVE" ? "pill ok" : "pill muted"
                        }
                      >
                        {trainer.userStatus === "ACTIVE" ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="text-muted">{trainer.phone ?? "미등록"}</td>
                    <td>{trainer.assignedMemberCount}</td>
                    <td>{trainer.todayConfirmedReservationCount}</td>
                    <td className="ops-right">
                      <div className={styles.tableActions}>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => void loadTrainerDetail(trainer.userId)}
                        >
                          상세
                        </button>
                        {canMutateTrainers ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => void startEditTrainer(trainer.userId)}
                          >
                            수정
                          </button>
                        ) : null}
                        {canMutateTrainers ? (
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              void toggleTrainerStatus(
                                trainer.userId,
                                trainer.userStatus === "ACTIVE"
                                  ? "INACTIVE"
                                  : "ACTIVE",
                              )
                            }
                          >
                            {trainer.userStatus === "ACTIVE" ? "비활성화" : "활성화"}
                          </button>
                        ) : null}
                      </div>
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
          pageSizeOptions={[10, 20, 50]}
          totalItems={pagination.totalItems}
          startItemIndex={pagination.startItemIndex}
          endItemIndex={pagination.endItemIndex}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </article>

      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedTrainer ? `${selectedTrainer.displayName} 상세` : "트레이너 상세"}
        size="lg"
      >
        {detailLoading ? (
          <div className="text-sm text-muted">상세 정보를 불러오는 중입니다...</div>
        ) : selectedTrainer ? (
          <>
            <div className={styles.detailGrid}>
              <div className={styles.detailCard}>
                <div className="text-xs text-muted">이름</div>
                <div className="brand-title mt-xs">{selectedTrainer.displayName}</div>
              </div>
              <div className={styles.detailCard}>
                <div className="text-xs text-muted">상태</div>
                <div className="brand-title mt-xs">
                  {selectedTrainer.userStatus === "ACTIVE" ? "활성" : "비활성"}
                </div>
              </div>
              <div className={styles.detailCard}>
                <div className="text-xs text-muted">연락처</div>
                <div className="brand-title mt-xs">{selectedTrainer.phone ?? "미등록"}</div>
              </div>
              <div className={styles.detailCard}>
                <div className="text-xs text-muted">담당 회원</div>
                <div className="brand-title mt-xs">{selectedTrainer.assignedMemberCount}명</div>
              </div>
              <div className={styles.detailCard}>
                <div className="text-xs text-muted">오늘 확정 예약</div>
                <div className="brand-title mt-xs">
                  {selectedTrainer.todayConfirmedReservationCount}건
                </div>
              </div>
              {selectedTrainer.loginId ? (
                <div className={styles.detailCard}>
                  <div className="text-xs text-muted">로그인 ID</div>
                  <div className="brand-title mt-xs">{selectedTrainer.loginId}</div>
                </div>
              ) : null}
            </div>

            <div className="ops-section mt-lg">
              <div className="ops-section__header">
                <div>
                  <h3 className="ops-section__title">담당 회원 요약</h3>
                  <p className="ops-section__subtitle">
                    현재 배정된 활성 또는 홀딩 회원권 기준 상위 20건입니다.
                  </p>
                </div>
              </div>
              {selectedTrainer.assignedMembers.length === 0 ? (
                <div className="text-sm text-muted">현재 배정된 회원이 없습니다.</div>
              ) : (
                <div className={styles.assignedList}>
                  {selectedTrainer.assignedMembers.map((member) => (
                    <div key={member.membershipId} className={styles.assignedItem}>
                      <div>
                        <div className="brand-title">{member.memberName}</div>
                        <div className="text-xs text-muted">
                          회원 #{member.memberId} · 회원권 #{member.membershipId}
                        </div>
                      </div>
                      <span
                        className={
                          member.membershipStatus === "ACTIVE" ? "pill ok" : "pill hold"
                        }
                      >
                        {member.membershipStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="ops-section mt-lg">
              <div className="ops-section__header">
                <div>
                  <h3 className="ops-section__title">가용 스케줄</h3>
                  <p className="ops-section__subtitle">
                    트레이너가 등록한 주간 가능 시간과 날짜별 예외를 조회합니다.
                  </p>
                </div>
                <label className="stack-sm">
                  <span className="text-xs text-muted brand-title">조회 월</span>
                  <input
                    className="input"
                    type="month"
                    value={availabilityMonth}
                    onChange={(event) => setAvailabilityMonth(event.target.value)}
                  />
                </label>
              </div>
              {trainerAvailabilityError ? (
                <div className="pill danger">{trainerAvailabilityError}</div>
              ) : null}
              {trainerAvailabilityLoading ? (
                <div className="text-sm text-muted">가용 스케줄을 불러오는 중입니다...</div>
              ) : trainerAvailabilitySnapshot ? (
                <div className={styles.availabilitySection}>
                  <div className={styles.availabilitySummary}>
                    <div className={styles.availabilityCard}>
                      <div className="text-xs text-muted">가용 일수</div>
                      <div className="brand-title mt-xs">
                        {
                          trainerAvailabilitySnapshot.effectiveDays.filter(
                            (day) => day.availabilityStatus === "AVAILABLE",
                          ).length
                        }
                        일
                      </div>
                    </div>
                    <div className={styles.availabilityCard}>
                      <div className="text-xs text-muted">예외 일정</div>
                      <div className="brand-title mt-xs">
                        {trainerAvailabilitySnapshot.exceptions.length}건
                      </div>
                    </div>
                  </div>

                  <TrainerAvailabilityMonthView snapshot={trainerAvailabilitySnapshot} />

                  <div className={styles.readonlyExceptionList}>
                    {trainerAvailabilitySnapshot.exceptions.length === 0 ? (
                      <div className="text-sm text-muted">등록된 예외 일정이 없습니다.</div>
                    ) : (
                      trainerAvailabilitySnapshot.exceptions.map((exception) => (
                        <div
                          key={exception.availabilityExceptionId}
                          className={styles.readonlyExceptionItem}
                        >
                          <div>
                            <div className="brand-title">{exception.exceptionDate}</div>
                            <div className="text-xs text-muted">
                              {exception.exceptionType === "OFF"
                                ? getAvailabilityStatusLabel("OFF")
                                : formatAvailabilityTimeRange(
                                    exception.overrideStartTime,
                                    exception.overrideEndTime,
                                  )}
                            </div>
                          </div>
                          <div className="text-sm text-muted">
                            {exception.memo ?? "메모 없음"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted">등록된 스케줄 정보가 없습니다.</div>
              )}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted">선택된 트레이너가 없습니다.</div>
        )}
      </Modal>

      <Modal
        isOpen={trainerFormOpen}
        onClose={() => setTrainerFormOpen(false)}
        title={trainerFormMode === "create" ? "트레이너 등록" : "트레이너 정보 수정"}
        footer={
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setTrainerFormOpen(false)}
            >
              닫기
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void submitTrainerForm()}
              disabled={trainerFormSubmitting}
            >
              {trainerFormSubmitting ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        <div className="stack-md">
          {trainerFormError ? <div className="pill danger">{trainerFormError}</div> : null}
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">센터 ID</span>
            <input
              className="input"
              type="number"
              min={1}
              value={trainerForm.centerId}
              disabled={!isSuperAdmin}
              onChange={(event) =>
                setTrainerForm((current) => ({
                  ...current,
                  centerId: Number(event.target.value || "1"),
                }))
              }
            />
          </label>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">로그인 ID</span>
            <input
              className="input"
              value={trainerForm.loginId}
              onChange={(event) =>
                setTrainerForm((current) => ({
                  ...current,
                  loginId: event.target.value,
                }))
              }
            />
          </label>
          {trainerFormMode === "create" ? (
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">초기 비밀번호</span>
              <input
                className="input"
                type="password"
                value={trainerForm.password}
                onChange={(event) =>
                  setTrainerForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </label>
          ) : null}
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">이름</span>
            <input
              className="input"
              value={trainerForm.displayName}
              onChange={(event) =>
                setTrainerForm((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </label>
          <label className="stack-sm">
            <span className="text-xs text-muted brand-title">연락처</span>
            <input
              className="input"
              value={trainerForm.phone}
              onChange={(event) =>
                setTrainerForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              placeholder="010-..."
            />
          </label>
        </div>
      </Modal>
    </section>
  );
}
