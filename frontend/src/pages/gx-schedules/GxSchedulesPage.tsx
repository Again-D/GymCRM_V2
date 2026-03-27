import { useEffect, useMemo, useState } from "react";

import {
  ApiClientError,
  apiDelete,
  apiPost,
  apiPut,
  isMockApiMode,
} from "../../api/client";
import { useAuthState } from "../../app/auth";
import { hasRole } from "../../app/roles";
import { Modal } from "../../shared/ui/Modal";
import { createDefaultTrainerFilters } from "../trainers/modules/types";
import { useTrainersQuery } from "../trainers/modules/useTrainersQuery";
import { useGxScheduleSnapshotQuery } from "./modules/useGxScheduleSnapshotQuery";
import {
  createEmptyRuleForm,
  createExceptionForm,
  createRuleFormFromRule,
  formatDateTime,
  getCurrentMonthValue,
  type GxScheduleSnapshot,
  type GxGeneratedSchedule,
  type GxScheduleExceptionForm,
  type GxScheduleRule,
  type GxScheduleRuleForm,
  WEEKDAY_OPTIONS,
} from "./modules/types";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { usePagination } from "../../shared/hooks/usePagination";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.detail) {
    return error.detail;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function GxSchedulesPage() {
  const { authUser } = useAuthState();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [ruleForm, setRuleForm] = useState<GxScheduleRuleForm>(() => createEmptyRuleForm());
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleFormErrors, setRuleFormErrors] = useState<Partial<Record<keyof GxScheduleRuleForm, string>>>({});
  const [editingRule, setEditingRule] = useState<GxScheduleRule | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<GxGeneratedSchedule | null>(null);
  const [exceptionForm, setExceptionForm] = useState<GxScheduleExceptionForm | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [savingException, setSavingException] = useState(false);
  const canManageRules =
    hasRole(authUser, "ROLE_SUPER_ADMIN") ||
    hasRole(authUser, "ROLE_CENTER_ADMIN") ||
    hasRole(authUser, "ROLE_MANAGER");
  const canManageExceptions = canManageRules || hasRole(authUser, "ROLE_TRAINER");

  const { snapshot, loading, error, loadSnapshot, applySnapshot } =
    useGxScheduleSnapshotQuery();
  const { trainers, loadTrainers, trainersLoading } = useTrainersQuery({
    getDefaultFilters: () => ({
      ...createDefaultTrainerFilters(authUser?.centerId ?? 1),
      status: "ACTIVE",
    }),
  });

  useEffect(() => {
    void loadCurrentSnapshot(selectedMonth);
  }, [loadSnapshot, selectedMonth, authUser]);

  useEffect(() => {
    if (canManageRules) {
      void loadTrainers();
    }
  }, [canManageRules, loadTrainers]);

  async function loadCurrentSnapshot(month: string) {
    if (!authUser) {
      return null;
    }
    if (isMockApiMode()) {
      const { getMockGxScheduleSnapshot } = await import("../../api/mockData");
      const nextSnapshot = getMockGxScheduleSnapshot(month, {
        userId: authUser.userId,
        roles: authUser.roles,
      });
      applySnapshot(nextSnapshot);
      return nextSnapshot;
    }
    return loadSnapshot(month);
  }

  const trainerOptions = useMemo(() => {
    if (!authUser) {
      return [];
    }
    if (hasRole(authUser, "ROLE_TRAINER")) {
      return [{ userId: authUser.userId, displayName: authUser.username }];
    }
    return trainers.map((trainer) => ({
      userId: trainer.userId,
      displayName: trainer.displayName,
    }));
  }, [authUser, trainers]);
  const trainerNameByUserId = useMemo(
    () =>
      new Map(
        trainerOptions.map((trainer) => [trainer.userId, trainer.displayName] as const),
      ),
    [trainerOptions],
  );
  const selectedException = useMemo(() => {
    if (!selectedSchedule || !snapshot) {
      return null;
    }
    const date = selectedSchedule.startAt.slice(0, 10);
    return (
      snapshot.exceptions.find(
        (exception) =>
          exception.ruleId === selectedSchedule.sourceRuleId &&
          exception.exceptionDate === date,
      ) ?? null
    );
  }, [selectedSchedule, snapshot]);

  const rules = useMemo(() => {
    return [...(snapshot?.rules ?? [])].sort((left, right) => {
      if (left.dayOfWeek !== right.dayOfWeek) {
        return left.dayOfWeek - right.dayOfWeek;
      }
      const startTimeCompare = left.startTime.localeCompare(right.startTime);
      if (startTimeCompare !== 0) {
        return startTimeCompare;
      }
      return left.className.localeCompare(right.className, "ko-KR");
    });
  }, [snapshot?.rules]);
  const generatedSchedules = useMemo(() => {
    return [...(snapshot?.generatedSchedules ?? [])].sort((left, right) =>
      left.startAt.localeCompare(right.startAt),
    );
  }, [snapshot?.generatedSchedules]);
  const trainerNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const rule of rules) {
      const trainerName = trainerNameByUserId.get(rule.trainerUserId);
      if (!trainerName) {
        continue;
      }
      counts.set(trainerName, (counts.get(trainerName) ?? 0) + 1);
    }
    return counts;
  }, [rules, trainerNameByUserId]);
  const rulesPagination = usePagination(rules, {
    initialPageSize: 5,
    resetDeps: [selectedMonth, rules.length],
  });
  const generatedSchedulesPagination = usePagination(generatedSchedules, {
    initialPageSize: 5,
    resetDeps: [selectedMonth, generatedSchedules.length],
  });

  function startCreateRule() {
    setEditingRule(null);
    setRuleForm(createEmptyRuleForm());
    setRuleFormErrors({});
    setIsRuleModalOpen(true);
  }

  function startEditRule(rule: GxScheduleRule) {
    setEditingRule(rule);
    setRuleForm(createRuleFormFromRule(rule));
    setRuleFormErrors({});
    setIsRuleModalOpen(true);
  }

  function closeRuleModal() {
    setIsRuleModalOpen(false);
    setEditingRule(null);
    setRuleForm(createEmptyRuleForm());
    setRuleFormErrors({});
  }

  function formatRuleTrainerLabel(trainerUserId: number) {
    const trainerName = trainerNameByUserId.get(trainerUserId);
    if (!trainerName) {
      return `#${trainerUserId}`;
    }
    if ((trainerNameCounts.get(trainerName) ?? 0) > 1) {
      return `${trainerName} (#${trainerUserId})`;
    }
    return trainerName;
  }

  function updateRuleFormField<K extends keyof GxScheduleRuleForm>(field: K, value: GxScheduleRuleForm[K]) {
    setRuleForm((current) => ({ ...current, [field]: value }));
    setRuleFormErrors((current) => {
      if (!current[field]) {
        return current;
      }
      return {
        ...current,
        [field]: undefined,
      };
    });
  }

  function validateRuleForm() {
    const nextErrors: Partial<Record<keyof GxScheduleRuleForm, string>> = {};

    if (!ruleForm.className.trim()) {
      nextErrors.className = "수업명을 입력해 주세요.";
    }
    if (!ruleForm.trainerUserId) {
      nextErrors.trainerUserId = "담당 트레이너를 선택해 주세요.";
    }
    if (!ruleForm.dayOfWeek) {
      nextErrors.dayOfWeek = "요일을 선택해 주세요.";
    }
    if (!ruleForm.startTime) {
      nextErrors.startTime = "시작 시간을 입력해 주세요.";
    }
    if (!ruleForm.endTime) {
      nextErrors.endTime = "종료 시간을 입력해 주세요.";
    }
    if (
      ruleForm.startTime &&
      ruleForm.endTime &&
      ruleForm.startTime >= ruleForm.endTime
    ) {
      nextErrors.endTime = "종료 시간은 시작 시간보다 늦어야 합니다.";
    }
    if (!ruleForm.capacity || Number(ruleForm.capacity) < 1) {
      nextErrors.capacity = "정원은 1명 이상이어야 합니다.";
    }
    if (!ruleForm.effectiveStartDate) {
      nextErrors.effectiveStartDate = "적용 시작일을 입력해 주세요.";
    }

    setRuleFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function openExceptionModal(schedule: GxGeneratedSchedule) {
    setSelectedSchedule(schedule);
    setExceptionForm(
      createExceptionForm(
        snapshot?.exceptions.find(
          (exception) =>
            exception.ruleId === schedule.sourceRuleId &&
            exception.exceptionDate === schedule.startAt.slice(0, 10),
        ),
        schedule.trainerUserId,
        schedule.capacity,
      ),
    );
  }

  async function submitRule() {
    if (!validateRuleForm()) {
      return;
    }
    setSavingRule(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      const path = editingRule
        ? `/api/v1/reservations/gx/rules/${editingRule.ruleId}?month=${selectedMonth}`
        : `/api/v1/reservations/gx/rules?month=${selectedMonth}`;
      const payload = {
        className: ruleForm.className,
        trainerUserId: Number(ruleForm.trainerUserId),
        dayOfWeek: Number(ruleForm.dayOfWeek),
        startTime: ruleForm.startTime,
        endTime: ruleForm.endTime,
        capacity: Number(ruleForm.capacity),
        effectiveStartDate: ruleForm.effectiveStartDate,
        ...(editingRule ? { active: ruleForm.active } : {}),
      };
      const nextSnapshot = isMockApiMode()
        ? editingRule
          ? (await import("../../api/mockData")).updateMockGxScheduleRule(
              editingRule.ruleId,
              selectedMonth,
              payload as {
                className: string;
                trainerUserId: number;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                capacity: number;
                effectiveStartDate: string;
                active: boolean;
              },
              authUser
                ? { userId: authUser.userId, roles: authUser.roles }
                : undefined,
            )
          : (await import("../../api/mockData")).createMockGxScheduleRule(
              selectedMonth,
              payload as {
                className: string;
                trainerUserId: number;
                dayOfWeek: number;
                startTime: string;
                endTime: string;
                capacity: number;
                effectiveStartDate: string;
              },
              authUser
                ? { userId: authUser.userId, roles: authUser.roles }
                : undefined,
            )
        : (
            editingRule
              ? await apiPut<GxScheduleSnapshot>(path, payload)
              : await apiPost<GxScheduleSnapshot>(path, payload)
          ).data;
      applySnapshot(nextSnapshot);
      setPanelMessage(
        editingRule ? "GX 반복 규칙을 저장했습니다." : "GX 반복 규칙을 생성했습니다.",
      );
      closeRuleModal();
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 반복 규칙을 저장하지 못했습니다."));
    } finally {
      setSavingRule(false);
    }
  }

  async function endRule(ruleId: number) {
    setPanelMessage(null);
    setPanelError(null);
    try {
      const nextSnapshot = isMockApiMode()
        ? (await import("../../api/mockData")).deleteMockGxScheduleRule(
            ruleId,
            selectedMonth,
            authUser ? { userId: authUser.userId, roles: authUser.roles } : undefined,
          )
        : (
            await apiDelete<GxScheduleSnapshot>(
              `/api/v1/reservations/gx/rules/${ruleId}?month=${selectedMonth}`,
            )
          ).data;
      applySnapshot(nextSnapshot);
      if (editingRule?.ruleId === ruleId) {
        setEditingRule(null);
        setRuleForm(createEmptyRuleForm());
      }
      setPanelMessage("GX 반복 규칙을 종료했습니다.");
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 반복 규칙을 종료하지 못했습니다."));
    }
  }

  async function submitException() {
    if (!selectedSchedule || !exceptionForm) {
      return;
    }
    setSavingException(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      const date = selectedSchedule.startAt.slice(0, 10);
      const path = `/api/v1/reservations/gx/rules/${selectedSchedule.sourceRuleId}/exceptions/${date}?month=${selectedMonth}`;
      const payload =
        exceptionForm.exceptionType === "OFF"
          ? {
              exceptionType: "OFF" as const,
              overrideTrainerUserId: null,
              overrideStartTime: null,
              overrideEndTime: null,
              overrideCapacity: null,
              memo: exceptionForm.memo.trim() || null,
            }
          : {
              exceptionType: "OVERRIDE" as const,
              overrideTrainerUserId: exceptionForm.overrideTrainerUserId
                ? Number(exceptionForm.overrideTrainerUserId)
                : null,
              overrideStartTime: exceptionForm.overrideStartTime,
              overrideEndTime: exceptionForm.overrideEndTime,
              overrideCapacity: exceptionForm.overrideCapacity
                ? Number(exceptionForm.overrideCapacity)
                : null,
              memo: exceptionForm.memo.trim() || null,
            };
      const nextSnapshot = isMockApiMode()
        ? (await import("../../api/mockData")).upsertMockGxScheduleException(
            Number(selectedSchedule.sourceRuleId),
            date,
            selectedMonth,
            payload,
            authUser ? { userId: authUser.userId, roles: authUser.roles } : undefined,
          )
        : (await apiPut<GxScheduleSnapshot>(path, payload)).data;
      applySnapshot(nextSnapshot);
      setPanelMessage("GX 회차 예외를 저장했습니다.");
      setSelectedSchedule(null);
      setExceptionForm(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 회차 예외를 저장하지 못했습니다."));
    } finally {
      setSavingException(false);
    }
  }

  async function resetException() {
    if (!selectedSchedule) {
      return;
    }
    setSavingException(true);
    setPanelMessage(null);
    setPanelError(null);
    try {
      const date = selectedSchedule.startAt.slice(0, 10);
      const nextSnapshot = isMockApiMode()
        ? (await import("../../api/mockData")).deleteMockGxScheduleException(
            Number(selectedSchedule.sourceRuleId),
            date,
            selectedMonth,
            authUser ? { userId: authUser.userId, roles: authUser.roles } : undefined,
          )
        : (
            await apiDelete<GxScheduleSnapshot>(
              `/api/v1/reservations/gx/rules/${selectedSchedule.sourceRuleId}/exceptions/${date}?month=${selectedMonth}`,
            )
          ).data;
      applySnapshot(nextSnapshot);
      setPanelMessage("GX 회차 예외를 삭제했습니다.");
      setSelectedSchedule(null);
      setExceptionForm(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "GX 회차 예외를 삭제하지 못했습니다."));
    } finally {
      setSavingException(false);
    }
  }

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">GX Schedule Ops</span>
          <h1 className="ops-title">GX 스케줄</h1>
          <p className="ops-subtitle">
            반복 규칙으로 GX 수업을 운영하고, 월별 생성 회차에 날짜별 예외를 적용합니다.
          </p>
          <div className="ops-meta">
            <span className="ops-meta__pill">반복 규칙</span>
            <span className="ops-meta__pill">4주 롤링 슬롯</span>
            <span className="ops-meta__pill">회차 예외</span>
          </div>
        </div>
        <label className="stack-sm">
          <span className="text-xs text-muted brand-title">조회 월</span>
          <input
            className="input"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
      </div>

      {(panelMessage || panelError || error) && (
        <div className="ops-feedback-stack">
          {panelMessage ? <div className="pill ok full-span">{panelMessage}</div> : null}
          {panelError || error ? (
            <div className="pill danger full-span">{panelError ?? error}</div>
          ) : null}
        </div>
      )}

      <div className="two-column-grid">
        <article className="panel-card stack-md">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">반복 규칙</h2>
              <p className="ops-section__subtitle">
                센터 매니저는 GX 수업 반복 규칙을 등록하고 종료할 수 있습니다.
              </p>
            </div>
            {canManageRules ? (
              <button type="button" className="secondary-button" onClick={startCreateRule}>
                새 규칙
              </button>
            ) : null}
          </div>

          {!canManageRules ? (
            <div className="pill muted full-span">현재 권한은 조회 전용입니다.</div>
          ) : null}

          <div className="stack-sm">
            {rulesPagination.pagedItems.map((rule) => (
              <div key={rule.ruleId} className="panel-card stack-xs">
                <div className="between-row">
                  <strong>{rule.className}</strong>
                  <span className={`pill ${rule.active ? "ok" : "muted"}`}>
                    {rule.active ? "활성" : "종료"}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {WEEKDAY_OPTIONS.find((option) => option.value === String(rule.dayOfWeek))?.label} ·{" "}
                  {rule.startTime.slice(0, 5)} - {rule.endTime.slice(0, 5)} · 정원 {rule.capacity}
                </div>
                <div className="text-sm text-muted">
                  적용 시작일 {rule.effectiveStartDate} · 트레이너{" "}
                  {formatRuleTrainerLabel(rule.trainerUserId)}
                </div>
                {canManageRules ? (
                  <div className="inline-actions">
                    <button type="button" className="secondary-button" onClick={() => startEditRule(rule)}>
                      수정
                    </button>
                    {rule.active ? (
                      <button type="button" className="danger-button" onClick={() => void endRule(rule.ruleId)}>
                        종료
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
            {!loading && rules.length === 0 ? (
              <div className="pill muted full-span">등록된 GX 반복 규칙이 없습니다.</div>
            ) : null}
          </div>
          {rules.length > 0 ? (
            <PaginationControls
              page={rulesPagination.page}
              totalPages={rulesPagination.totalPages}
              pageSize={rulesPagination.pageSize}
              pageSizeOptions={[5, 10, 20]}
              totalItems={rulesPagination.totalItems}
              startItemIndex={rulesPagination.startItemIndex}
              endItemIndex={rulesPagination.endItemIndex}
              onPageChange={rulesPagination.setPage}
              onPageSizeChange={rulesPagination.setPageSize}
            />
          ) : null}
        </article>

        <article className="panel-card stack-md">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">생성된 회차</h2>
              <p className="ops-section__subtitle">
                월별 생성된 GX 수업 회차와 정원 점유 상태를 확인하고 날짜별 예외를 적용합니다.
              </p>
            </div>
          </div>
          <div className="stack-sm">
            {generatedSchedulesPagination.pagedItems.map((schedule) => (
              <div key={schedule.scheduleId} className="panel-card stack-xs">
                <div className="between-row">
                  <strong>{schedule.className}</strong>
                  <span className={`pill ${schedule.currentCount > 0 ? "warning" : "info"}`}>
                    {schedule.currentCount}/{schedule.capacity}
                  </span>
                </div>
                <div className="text-sm text-muted">
                  {formatDateTime(schedule.startAt)} - {formatDateTime(schedule.endAt)}
                </div>
                <div className="text-sm text-muted">{schedule.trainerName}</div>
                {canManageExceptions ? (
                  <button type="button" className="secondary-button" onClick={() => openExceptionModal(schedule)}>
                    회차 예외
                  </button>
                ) : null}
              </div>
            ))}
            {!loading && generatedSchedules.length === 0 ? (
              <div className="pill muted full-span">선택한 월에 생성된 GX 회차가 없습니다.</div>
            ) : null}
          </div>
          {generatedSchedules.length > 0 ? (
            <PaginationControls
              page={generatedSchedulesPagination.page}
              totalPages={generatedSchedulesPagination.totalPages}
              pageSize={generatedSchedulesPagination.pageSize}
              pageSizeOptions={[5, 10, 20]}
              totalItems={generatedSchedulesPagination.totalItems}
              startItemIndex={generatedSchedulesPagination.startItemIndex}
              endItemIndex={generatedSchedulesPagination.endItemIndex}
              onPageChange={generatedSchedulesPagination.setPage}
              onPageSizeChange={generatedSchedulesPagination.setPageSize}
            />
          ) : null}
        </article>
      </div>

      <Modal
        isOpen={isRuleModalOpen}
        title={editingRule ? "GX 규칙 수정" : "새 GX 규칙"}
        onClose={closeRuleModal}
        footer={(
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={closeRuleModal}
              disabled={savingRule}
            >
              {editingRule ? "수정 취소" : "취소"}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void submitRule()}
              disabled={savingRule}
            >
              {savingRule ? "저장 중..." : editingRule ? "규칙 저장" : "규칙 생성"}
            </button>
          </>
        )}
      >
        <div className="stack-md">
          <div className="pill info full-span">`*` 표시는 필수 항목입니다.</div>
          <label className="stack-xs">
            <span className="text-xs text-muted brand-title">수업명 *</span>
            <input
              className="input"
              placeholder="예: 저녁 요가"
              value={ruleForm.className}
              onChange={(event) => updateRuleFormField("className", event.target.value)}
              aria-invalid={ruleFormErrors.className ? "true" : "false"}
              required
            />
            {ruleFormErrors.className ? (
              <span className="text-xs text-danger">{ruleFormErrors.className}</span>
            ) : null}
          </label>
          <label className="stack-xs">
            <span className="text-xs text-muted brand-title">담당 트레이너 *</span>
            <select
              className="input"
              value={ruleForm.trainerUserId}
              onChange={(event) => updateRuleFormField("trainerUserId", event.target.value)}
              disabled={trainersLoading}
              aria-invalid={ruleFormErrors.trainerUserId ? "true" : "false"}
              required
            >
              <option value="">담당 트레이너 선택</option>
              {trainerOptions.map((trainer) => (
                <option key={trainer.userId} value={trainer.userId}>
                  {trainer.displayName}
                </option>
              ))}
            </select>
            {ruleFormErrors.trainerUserId ? (
              <span className="text-xs text-danger">{ruleFormErrors.trainerUserId}</span>
            ) : null}
          </label>
          <label className="stack-xs">
            <span className="text-xs text-muted brand-title">요일 *</span>
            <select
              className="input"
              value={ruleForm.dayOfWeek}
              onChange={(event) => updateRuleFormField("dayOfWeek", event.target.value)}
              aria-invalid={ruleFormErrors.dayOfWeek ? "true" : "false"}
              required
            >
              {WEEKDAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {ruleFormErrors.dayOfWeek ? (
              <span className="text-xs text-danger">{ruleFormErrors.dayOfWeek}</span>
            ) : null}
          </label>
          <div className="responsive-fields">
            <label className="stack-xs">
              <span className="text-xs text-muted brand-title">시작 시간 *</span>
              <input
                className="input"
                type="time"
                value={ruleForm.startTime}
                onChange={(event) => updateRuleFormField("startTime", event.target.value)}
                aria-invalid={ruleFormErrors.startTime ? "true" : "false"}
                required
              />
              {ruleFormErrors.startTime ? (
                <span className="text-xs text-danger">{ruleFormErrors.startTime}</span>
              ) : null}
            </label>
            <label className="stack-xs">
              <span className="text-xs text-muted brand-title">종료 시간 *</span>
              <input
                className="input"
                type="time"
                value={ruleForm.endTime}
                onChange={(event) => updateRuleFormField("endTime", event.target.value)}
                aria-invalid={ruleFormErrors.endTime ? "true" : "false"}
                required
              />
              {ruleFormErrors.endTime ? (
                <span className="text-xs text-danger">{ruleFormErrors.endTime}</span>
              ) : null}
            </label>
          </div>
          <div className="responsive-fields">
            <label className="stack-xs">
              <span className="text-xs text-muted brand-title">정원 *</span>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="예: 20"
                value={ruleForm.capacity}
                onChange={(event) => updateRuleFormField("capacity", event.target.value)}
                aria-invalid={ruleFormErrors.capacity ? "true" : "false"}
                required
              />
              {ruleFormErrors.capacity ? (
                <span className="text-xs text-danger">{ruleFormErrors.capacity}</span>
              ) : null}
            </label>
            <label className="stack-xs">
              <span className="text-xs text-muted brand-title">적용 시작일 *</span>
              <input
                className="input"
                type="date"
                value={ruleForm.effectiveStartDate}
                onChange={(event) => updateRuleFormField("effectiveStartDate", event.target.value)}
                aria-invalid={ruleFormErrors.effectiveStartDate ? "true" : "false"}
                required
              />
              {ruleFormErrors.effectiveStartDate ? (
                <span className="text-xs text-danger">{ruleFormErrors.effectiveStartDate}</span>
              ) : null}
            </label>
          </div>
          {editingRule ? (
            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={ruleForm.active}
                onChange={(event) =>
                  setRuleForm((current) => ({ ...current, active: event.target.checked }))
                }
              />
              활성 상태 유지
            </label>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={selectedSchedule != null && exceptionForm != null}
        title="GX 회차 예외"
        onClose={() => {
          setSelectedSchedule(null);
          setExceptionForm(null);
        }}
      >
        {selectedSchedule && exceptionForm ? (
          <div className="stack-md">
            <div className="text-sm text-muted">
              {selectedSchedule.className} · {formatDateTime(selectedSchedule.startAt)}
            </div>
            <label className="stack-xs">
              <span className="text-xs text-muted brand-title">예외 유형</span>
              <select
                className="input"
                value={exceptionForm.exceptionType}
                onChange={(event) =>
                  setExceptionForm((current) =>
                    current
                      ? {
                          ...current,
                          exceptionType: event.target.value as GxScheduleExceptionForm["exceptionType"],
                        }
                      : current,
                  )
                }
              >
                <option value="OFF">휴강</option>
                <option value="OVERRIDE">변경</option>
              </select>
            </label>
            {exceptionForm.exceptionType === "OVERRIDE" ? (
              <>
                <label className="stack-xs">
                  <span className="text-xs text-muted brand-title">변경 담당 트레이너</span>
                  <select
                    className="input"
                    value={exceptionForm.overrideTrainerUserId}
                    onChange={(event) =>
                      setExceptionForm((current) =>
                        current
                          ? { ...current, overrideTrainerUserId: event.target.value }
                          : current,
                      )
                    }
                    disabled={hasRole(authUser, "ROLE_TRAINER")}
                  >
                    <option value="">담당 트레이너</option>
                    {trainerOptions.map((trainer) => (
                      <option key={trainer.userId} value={trainer.userId}>
                        {trainer.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="responsive-fields">
                  <label className="stack-xs">
                    <span className="text-xs text-muted brand-title">변경 시작 시간</span>
                    <input
                      className="input"
                      type="time"
                      value={exceptionForm.overrideStartTime}
                      onChange={(event) =>
                        setExceptionForm((current) =>
                          current
                            ? { ...current, overrideStartTime: event.target.value }
                            : current,
                        )
                      }
                    />
                  </label>
                  <label className="stack-xs">
                    <span className="text-xs text-muted brand-title">변경 종료 시간</span>
                    <input
                      className="input"
                      type="time"
                      value={exceptionForm.overrideEndTime}
                      onChange={(event) =>
                        setExceptionForm((current) =>
                          current
                            ? { ...current, overrideEndTime: event.target.value }
                            : current,
                        )
                      }
                    />
                  </label>
                </div>
                <label className="stack-xs">
                  <span className="text-xs text-muted brand-title">변경 정원</span>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="정원"
                    value={exceptionForm.overrideCapacity}
                    onChange={(event) =>
                      setExceptionForm((current) =>
                        current
                          ? { ...current, overrideCapacity: event.target.value }
                          : current,
                      )
                    }
                  />
                </label>
              </>
            ) : null}
            <label className="stack-xs">
              <span className="text-xs text-muted brand-title">메모</span>
              <textarea
                className="input"
                rows={4}
                placeholder="메모"
                value={exceptionForm.memo}
                onChange={(event) =>
                  setExceptionForm((current) =>
                    current ? { ...current, memo: event.target.value } : current,
                  )
                }
              />
            </label>
            <div className="inline-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => void resetException()}
                disabled={!selectedException || savingException}
              >
                예외 삭제
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => void submitException()}
                disabled={savingException}
              >
                {savingException ? "저장 중..." : "예외 저장"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
