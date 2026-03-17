import { useEffect } from "react";

import { useAuthState } from "../../app/auth";
import { formatDate } from "../../shared/format";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { createDefaultCrmFilters } from "./modules/types";
import { useCrmHistoryQuery } from "./modules/useCrmHistoryQuery";
import { useCrmPrototypeState } from "./modules/useCrmPrototypeState";

import styles from "./CrmPage.module.css";

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
  "SENT": { label: "발송 완료", class: "pill ok" },
  "PENDING": { label: "대기 중", class: "pill info" },
  "RETRY_WAIT": { label: "재시도 예정", class: "pill warn" },
  "DEAD": { label: "실패", class: "pill danger" }
};

export default function CrmPage() {
  const { authUser, isMockMode } = useAuthState();
  const {
    crmFilters,
    setCrmFilters,
    crmTriggerDaysAhead,
    setCrmTriggerDaysAhead,
    crmTriggerSubmitting,
    crmProcessSubmitting,
    crmPanelMessage,
    crmPanelError,
    clearCrmFeedback,
    triggerCrmExpiryReminder,
    processCrmQueue
  } = useCrmPrototypeState();
  
  const { crmHistoryRows, crmHistoryLoading, crmHistoryError, loadCrmHistory, resetCrmHistoryQuery } = useCrmHistoryQuery();
  
  const isLiveCrmRoleSupported =
    isMockMode || authUser?.role === "ROLE_CENTER_ADMIN" || authUser?.role === "ROLE_DESK";

  const historyPagination = usePagination(crmHistoryRows, {
    initialPageSize: 10,
    resetDeps: [crmHistoryRows.length, crmFilters.sendStatus, crmFilters.limit]
  });
  const pendingCount = crmHistoryRows.filter((row) => row.sendStatus === "PENDING" || row.sendStatus === "RETRY_WAIT").length;
  const failedCount = crmHistoryRows.filter((row) => row.sendStatus === "DEAD").length;
  const sentCount = crmHistoryRows.filter((row) => row.sendStatus === "SENT").length;

  useEffect(() => {
    if (!isLiveCrmRoleSupported) {
      clearCrmFeedback();
      resetCrmHistoryQuery();
      return;
    }
    void loadCrmHistory(crmFilters);
  }, [clearCrmFeedback, crmFilters, isLiveCrmRoleSupported, loadCrmHistory, resetCrmHistoryQuery]);

  async function reloadHistory(filters = crmFilters) {
    if (!isLiveCrmRoleSupported) return;
    await loadCrmHistory(filters);
  }

  async function runTrigger() {
    const ok = await triggerCrmExpiryReminder();
    if (ok) await reloadHistory();
  }

  async function runProcess() {
    const ok = await processCrmQueue();
    if (ok) await reloadHistory();
  }

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">메시지 큐</span>
          <h1 className="ops-title">CRM 운영</h1>
          <p className="ops-subtitle">만료 안내 대상자를 적재하고 메시지 발송 상태를 한 화면에서 점검할 수 있습니다.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">큐 자동화</span>
            <span className="ops-meta__pill">발송 감사</span>
            <span className="ops-meta__pill">권한 기반 제한</span>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button ops-action-button"
          disabled={!isLiveCrmRoleSupported}
          onClick={() => {
            clearCrmFeedback();
            const nextFilters = createDefaultCrmFilters();
            setCrmFilters(nextFilters);
            void reloadHistory(nextFilters);
          }}
        >
          로그 새로고침
        </button>
      </div>

      <div className="ops-stat-strip">
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">전체 로그</span>
          <span className="ops-stat-card__value">{crmHistoryRows.length}</span>
          <span className="ops-stat-card__hint">조회 조건 내의 전체 발송 이력</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">대기 중인 큐</span>
          <span className={`ops-stat-card__value ${styles.info}`}>{pendingCount}</span>
          <span className="ops-stat-card__hint">발송 대기 및 재시도 예정 건수</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">발송 성공</span>
          <span className={`ops-stat-card__value ${styles.ok}`}>{sentCount}</span>
          <span className="ops-stat-card__hint">최종 발송 완료 처리된 이벤트</span>
        </div>
        <div className="ops-stat-card">
          <span className="ops-stat-card__label">최종 실패</span>
          <span className={`ops-stat-card__value ${styles.danger}`}>{failedCount}</span>
          <span className="ops-stat-card__hint">수동 확인이 필요한 DEAD 상태 건수</span>
        </div>
      </div>

      <article className="panel-card">
        <div className="ops-surface-grid">
          <div className="ops-block">
            <span className="ops-focus-card__eyebrow">큐 자동화 제어</span>
            <div className="stack-md mt-sm">
               <label className="stack-sm">
                 <span className="text-xs brand-title">만료 안내 기준 (D-Day)</span>
                 <input
                   className="input"
                   type="number"
                   min={0}
                   max={30}
                   value={crmTriggerDaysAhead}
                   disabled={!isLiveCrmRoleSupported}
                   onChange={(event) => setCrmTriggerDaysAhead(event.target.value)}
                   placeholder="일수 입력"
                 />
                 <span className="text-xs text-muted">입력한 일수만큼 만료가 남은 회원을 추출합니다.</span>
               </label>
               <div className="ops-table-actions mt-sm">
                  <button
                    type="button"
                    className="primary-button ops-action-button"
                    onClick={() => void runTrigger()}
                    disabled={crmTriggerSubmitting || !isLiveCrmRoleSupported}
                  >
                    {crmTriggerSubmitting ? "적재 중..." : "안내 대상 적재"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button ops-action-button"
                    onClick={() => void runProcess()}
                    disabled={crmProcessSubmitting || !isLiveCrmRoleSupported}
                  >
                    {crmProcessSubmitting ? "발송 중..." : "메시지 큐 실행"}
                  </button>
               </div>
            </div>
          </div>

          {/* STATUS MONITOR */}
          <div className="ops-block">
             <span className="ops-focus-card__eyebrow">운영 피드백 및 상태</span>
             <div className="ops-feedback-stack mt-md">
                {!isLiveCrmRoleSupported && (
                  <div className="field-ops-note field-ops-note--restricted">
                    <span className="field-ops-note__label">운영 권한 제한</span>
                    <div className="text-sm brand-title mt-xs">현재 관리자 권한이 없어 CRM 발송 작업을 실행할 수 없습니다.</div>
                    <div className="mt-xs text-sm">시스템 설정에서 적절한 운영 역할을 부여받아야 합니다.</div>
                  </div>
                )}
                {crmPanelMessage && <div className={`pill ok full-span ${styles.feedbackPill}`}>{crmPanelMessage}</div>}
                {crmPanelError && <div className={`pill danger full-span ${styles.feedbackPill}`}>{crmPanelError}</div>}
                {!crmPanelMessage && !crmPanelError && (
                  <div className={`ops-empty ${styles.emptyFeed}`}>
                    <p className="text-muted text-sm">실행 대기 중입니다.<br/>좌측 패널에서 작업을 선택해 주세요.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </article>

      {/* HISTORY TABLE */}
      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">발송 로그 및 이력</h2>
            <p className="ops-section__subtitle">발송 상태, 재시도, 실패 이력을 확인합니다.</p>
          </div>
          <div className="row-actions">
              <select
                className="input"
                value={crmFilters.sendStatus}
                disabled={!isLiveCrmRoleSupported}
                onChange={(event) =>
                  setCrmFilters((prev) => ({
                    ...prev,
                    sendStatus: event.target.value as typeof prev.sendStatus
                  }))
                }
              >
                <option value="">전체 상태</option>
                <option value="PENDING">대기 중</option>
                <option value="RETRY_WAIT">재시도 예정</option>
                <option value="SENT">발송 완료</option>
                <option value="DEAD">실패</option>
              </select>
           </div>
        </div>

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>대상</th>
                <th>이벤트</th>
                <th>상태</th>
                <th>시도 횟수</th>
                <th className="ops-right">기록 시각</th>
              </tr>
            </thead>
            <tbody>
              {historyPagination.pagedItems.map((row) => {
                const status = statusMap[row.sendStatus] || { label: row.sendStatus, class: 'pill muted' };
                return (
                  <tr key={row.crmMessageEventId}>
                    <td>
                      <div className="stack-sm">
                        <span className="text-sm brand-title">회원 #{row.memberId}</span>
                        <span className="text-xs text-muted">로그 #{row.crmMessageEventId}</span>
                      </div>
                    </td>
                    <td><span className="text-xs brand-title">{row.eventType}</span></td>
                    <td><span className={status.class}>{status.label}</span></td>
                    <td>
                      <div className="stack-sm">
                        <span className="text-xs brand-title">{row.attemptCount} / 3 시도</span>
                        {row.lastErrorMessage && <span className={`text-xs text-danger ${styles.errorMsg}`}>{row.lastErrorMessage}</span>}
                      </div>
                    </td>
                    <td className="ops-right">
                      <span className="text-xs text-muted">{formatDateTime(row.createdAt)}</span>
                    </td>
                  </tr>
                );
              })}
              {historyPagination.pagedItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    {crmHistoryLoading ? "로그 불러오는 중..." : "발송 이력이 없습니다."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-md">
          <PaginationControls {...historyPagination} pageSizeOptions={[10, 20]} onPageChange={historyPagination.setPage} onPageSizeChange={historyPagination.setPageSize} />
        </div>
      </article>

    </section>
  );
}
