import { useEffect, useState } from "react";

import {
  ApiClientError,
  apiDelete,
  apiPut,
  isMockApiMode,
} from "../../api/client";
import { useAuthState } from "../../app/auth";
import { Modal } from "../../shared/ui/Modal";
import { TrainerAvailabilityMonthView } from "./TrainerAvailabilityMonthView";
import {
  buildWeeklyRulesPayload,
  createDefaultWeeklyRuleDrafts,
  createExceptionDraftForDate,
  createWeeklyRuleDraftsFromSnapshot,
  formatAvailabilityTimeRange,
  getAvailabilityStatusLabel,
  getCurrentMonthValue,
  getWeekdayLabel,
  type ExceptionDraft,
  type TrainerAvailabilitySnapshot,
  type WeeklyRuleDraft,
} from "./modules/types";
import { useTrainerAvailabilityQuery } from "./modules/useTrainerAvailabilityQuery";

import styles from "./TrainerAvailabilityPage.module.css";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError && error.detail) {
    return error.detail;
  }
  return error instanceof Error ? error.message : fallback;
}

export default function TrainerAvailabilityPage() {
  const { authUser } = useAuthState();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [weeklyDrafts, setWeeklyDrafts] = useState<WeeklyRuleDraft[]>(() =>
    createDefaultWeeklyRuleDrafts(),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [exceptionDraft, setExceptionDraft] = useState<ExceptionDraft | null>(null);
  const [panelMessage, setPanelMessage] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [savingException, setSavingException] = useState(false);
  const { snapshot, loading, error, loadSnapshot, applySnapshot } =
    useTrainerAvailabilityQuery();

  useEffect(() => {
    if (!authUser) {
      return;
    }
    void loadCurrentSnapshot(selectedMonth);
  }, [authUser, selectedMonth]);

  async function loadCurrentSnapshot(month: string) {
    if (!authUser) {
      return null;
    }

    try {
      setPanelError(null);
      const nextSnapshot = isMockApiMode()
        ? await loadMockSnapshot(authUser.userId, month)
        : await loadSnapshot({ type: "me", userId: authUser.userId }, month);
      if (nextSnapshot) {
        applySnapshot(nextSnapshot);
        setWeeklyDrafts(createWeeklyRuleDraftsFromSnapshot(nextSnapshot));
      }
      return nextSnapshot;
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "내 스케줄을 불러오지 못했습니다."));
      return null;
    }
  }

  async function loadMockSnapshot(userId: number, month: string) {
    const { getMockTrainerAvailabilitySnapshot } = await import("../../api/mockData");
    return getMockTrainerAvailabilitySnapshot(userId, month);
  }

  async function saveWeeklyRules() {
    if (!authUser) {
      return;
    }
    setSavingWeekly(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      const rules = buildWeeklyRulesPayload(weeklyDrafts);
      let nextSnapshot: TrainerAvailabilitySnapshot;
      if (isMockApiMode()) {
        const { replaceMockTrainerAvailabilityWeeklyRules } = await import(
          "../../api/mockData"
        );
        nextSnapshot = replaceMockTrainerAvailabilityWeeklyRules(
          authUser.userId,
          selectedMonth,
          rules,
        );
      } else {
        const response = await apiPut<TrainerAvailabilitySnapshot>(
          `/api/v1/trainers/me/availability/weekly?month=${selectedMonth}`,
          { rules },
        );
        nextSnapshot = response.data;
      }
      setWeeklyDrafts(createWeeklyRuleDraftsFromSnapshot(nextSnapshot));
      setPanelMessage("기본 주간 스케줄을 저장했습니다.");
      setSelectedDate(null);
      setExceptionDraft(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "기본 주간 스케줄을 저장하지 못했습니다."));
    } finally {
      setSavingWeekly(false);
      await loadCurrentSnapshot(selectedMonth);
    }
  }

  function openExceptionEditor(date: string) {
    setSelectedDate(date);
    setExceptionDraft(createExceptionDraftForDate(snapshot, date));
  }

  async function saveException() {
    if (!authUser || !selectedDate || !exceptionDraft) {
      return;
    }

    setSavingException(true);
    setPanelMessage(null);
    setPanelError(null);

    try {
      if (exceptionDraft.mode === "DEFAULT") {
        if (isMockApiMode()) {
          const { deleteMockTrainerAvailabilityException } = await import(
            "../../api/mockData"
          );
          deleteMockTrainerAvailabilityException(
            authUser.userId,
            selectedMonth,
            selectedDate,
          );
        } else {
          await apiDelete<TrainerAvailabilitySnapshot>(
            `/api/v1/trainers/me/availability/exceptions/${selectedDate}?month=${selectedMonth}`,
          );
        }
        setPanelMessage("해당 날짜 예외를 삭제했습니다.");
      } else if (isMockApiMode()) {
        const { upsertMockTrainerAvailabilityException } = await import(
          "../../api/mockData"
        );
        upsertMockTrainerAvailabilityException(
          authUser.userId,
          selectedMonth,
          selectedDate,
          {
            exceptionType: exceptionDraft.mode,
            overrideStartTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideStartTime
                : null,
            overrideEndTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideEndTime
                : null,
            memo: exceptionDraft.memo.trim() || null,
          },
        );
        setPanelMessage("예외 스케줄을 저장했습니다.");
      } else {
        await apiPut<TrainerAvailabilitySnapshot>(
          `/api/v1/trainers/me/availability/exceptions/${selectedDate}?month=${selectedMonth}`,
          {
            exceptionType: exceptionDraft.mode,
            overrideStartTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideStartTime
                : null,
            overrideEndTime:
              exceptionDraft.mode === "OVERRIDE"
                ? exceptionDraft.overrideEndTime
                : null,
            memo: exceptionDraft.memo.trim() || null,
          },
        );
        setPanelMessage("예외 스케줄을 저장했습니다.");
      }
      setSelectedDate(null);
      setExceptionDraft(null);
    } catch (caught) {
      setPanelError(getErrorMessage(caught, "예외 스케줄을 저장하지 못했습니다."));
    } finally {
      setSavingException(false);
      await loadCurrentSnapshot(selectedMonth);
    }
  }

  const currentDay = selectedDate
    ? snapshot?.effectiveDays.find((day) => day.date === selectedDate) ?? null
    : null;

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">Trainer Self-Service</span>
          <h1 className="ops-title">내 스케줄</h1>
          <p className="ops-subtitle">
            주간 가능 시간과 날짜별 휴무/예외를 직접 관리하고, 월별 가용 상태를 캘린더로 확인합니다.
          </p>
          <div className="ops-meta">
            <span className="ops-meta__pill">주간 반복 규칙</span>
            <span className="ops-meta__pill">날짜별 예외</span>
            <span className="ops-meta__pill">관리자 조회 연동</span>
          </div>
        </div>
        <div className={styles.heroActions}>
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
      </div>

      {(panelMessage || panelError || error) && (
        <div className="ops-feedback-stack">
          {panelMessage ? <div className="pill ok full-span">{panelMessage}</div> : null}
          {panelError || error ? (
            <div className="pill danger full-span">{panelError ?? error}</div>
          ) : null}
        </div>
      )}

      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">기본 주간 가능 시간</h2>
            <p className="ops-section__subtitle">
              요일별 단일 시간 범위를 저장합니다. 비활성 요일은 예약 가능 시간이 없는 날로 처리됩니다.
            </p>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => void saveWeeklyRules()}
            disabled={savingWeekly || loading}
          >
            {savingWeekly ? "저장 중..." : "주간 스케줄 저장"}
          </button>
        </div>

        <div className={styles.weeklyGrid}>
          {weeklyDrafts.map((draft) => (
            <div key={draft.dayOfWeek} className={styles.weeklyRow}>
              <label className={styles.weeklyLabel}>
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(event) =>
                    setWeeklyDrafts((current) =>
                      current.map((item) =>
                        item.dayOfWeek === draft.dayOfWeek
                          ? { ...item, enabled: event.target.checked }
                          : item,
                      ),
                    )
                  }
                />
                <span>{getWeekdayLabel(draft.dayOfWeek)}</span>
              </label>
              <div className={styles.weeklyTimeGroup}>
                <input
                  className="input"
                  type="time"
                  value={draft.startTime}
                  disabled={!draft.enabled}
                  onChange={(event) =>
                    setWeeklyDrafts((current) =>
                      current.map((item) =>
                        item.dayOfWeek === draft.dayOfWeek
                          ? { ...item, startTime: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <input
                  className="input"
                  type="time"
                  value={draft.endTime}
                  disabled={!draft.enabled}
                  onChange={(event) =>
                    setWeeklyDrafts((current) =>
                      current.map((item) =>
                        item.dayOfWeek === draft.dayOfWeek
                          ? { ...item, endTime: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <p className={`text-xs text-muted ${styles.weeklyHelp}`}>
          초기 버전은 하루당 하나의 시간 범위만 지원합니다.
        </p>
      </article>

      <article className="panel-card">
        <div className={`${styles.monthToolbar} ops-section__header`}>
          <div>
            <h2 className="ops-section__title">월간 가용 캘린더</h2>
            <p className="ops-section__subtitle">
              날짜를 선택하면 휴무 또는 단일 시간 예외를 등록할 수 있습니다.
            </p>
          </div>
          <div className={styles.monthToolbarActions}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void loadCurrentSnapshot(selectedMonth)}
              disabled={loading}
            >
              {loading ? "불러오는 중..." : "새로고침"}
            </button>
          </div>
        </div>

        {snapshot ? (
          <TrainerAvailabilityMonthView
            snapshot={snapshot}
            selectedDate={selectedDate}
            onSelectDate={openExceptionEditor}
            interactive
          />
        ) : (
          <div className="text-sm text-muted">스케줄 정보를 불러오는 중입니다.</div>
        )}
      </article>

      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">등록된 날짜별 예외</h2>
            <p className="ops-section__subtitle">
              현재 월에 저장된 휴무와 시간 변경 메모를 확인합니다.
            </p>
          </div>
        </div>
        {!snapshot || snapshot.exceptions.length === 0 ? (
          <div className="text-sm text-muted">등록된 예외 일정이 없습니다.</div>
        ) : (
          <div className={styles.exceptionList}>
            {snapshot.exceptions.map((exception) => (
              <button
                key={exception.availabilityExceptionId}
                type="button"
                className={styles.exceptionItem}
                onClick={() => openExceptionEditor(exception.exceptionDate)}
              >
                <div className={styles.exceptionMeta}>
                  <div className="brand-title">{exception.exceptionDate}</div>
                  <div className="text-sm text-muted">
                    {exception.exceptionType === "OFF"
                      ? "하루 휴무"
                      : formatAvailabilityTimeRange(
                          exception.overrideStartTime,
                          exception.overrideEndTime,
                        )}
                  </div>
                </div>
                <div className="text-sm text-muted">{exception.memo ?? "메모 없음"}</div>
              </button>
            ))}
          </div>
        )}
      </article>

      <Modal
        isOpen={selectedDate != null && exceptionDraft != null}
        onClose={() => {
          setSelectedDate(null);
          setExceptionDraft(null);
        }}
        title={selectedDate ? `${selectedDate} 예외 스케줄` : "예외 스케줄"}
        footer={
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSelectedDate(null);
                setExceptionDraft(null);
              }}
            >
              닫기
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => void saveException()}
              disabled={savingException}
            >
              {savingException ? "저장 중..." : "저장"}
            </button>
          </>
        }
      >
        {selectedDate && exceptionDraft ? (
          <div className="stack-md">
            {currentDay ? (
              <div className="field-ops-note">
                <span className="field-ops-note__label">
                  현재 상태: {getAvailabilityStatusLabel(currentDay.availabilityStatus)}
                </span>
                <div className="text-sm brand-title mt-xs">
                  {formatAvailabilityTimeRange(currentDay.startTime, currentDay.endTime)}
                </div>
              </div>
            ) : null}
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">예외 유형</span>
              <select
                className="input"
                value={exceptionDraft.mode}
                onChange={(event) =>
                  setExceptionDraft((current) =>
                    current
                      ? {
                          ...current,
                          mode: event.target.value as ExceptionDraft["mode"],
                        }
                      : current,
                  )
                }
              >
                <option value="DEFAULT">기본 스케줄 따름</option>
                <option value="OFF">하루 휴무</option>
                <option value="OVERRIDE">시간 변경</option>
              </select>
            </label>
            {exceptionDraft.mode === "OVERRIDE" ? (
              <>
                <label className="stack-sm">
                  <span className="text-xs text-muted brand-title">시작 시간</span>
                  <input
                    className="input"
                    type="time"
                    value={exceptionDraft.overrideStartTime}
                    onChange={(event) =>
                      setExceptionDraft((current) =>
                        current
                          ? { ...current, overrideStartTime: event.target.value }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="stack-sm">
                  <span className="text-xs text-muted brand-title">종료 시간</span>
                  <input
                    className="input"
                    type="time"
                    value={exceptionDraft.overrideEndTime}
                    onChange={(event) =>
                      setExceptionDraft((current) =>
                        current
                          ? { ...current, overrideEndTime: event.target.value }
                          : current,
                      )
                    }
                  />
                </label>
              </>
            ) : null}
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">메모</span>
              <textarea
                className="input"
                rows={4}
                value={exceptionDraft.memo}
                onChange={(event) =>
                  setExceptionDraft((current) =>
                    current ? { ...current, memo: event.target.value } : current,
                  )
                }
                placeholder="세미나, 외부 수업, 반차 등 운영 메모"
              />
            </label>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
