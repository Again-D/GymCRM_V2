import { useEffect } from "react";

import { useAuthState } from "../../app/auth";
import { formatDate } from "../../shared/format";
import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { createDefaultCrmFilters } from "./modules/types";
import { useCrmHistoryQuery } from "./modules/useCrmHistoryQuery";
import { useCrmPrototypeState } from "./modules/useCrmPrototypeState";

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

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

  useEffect(() => {
    if (!isLiveCrmRoleSupported) {
      clearCrmFeedback();
      resetCrmHistoryQuery();
      return;
    }
    void loadCrmHistory(crmFilters);
    return () => {
      resetCrmHistoryQuery();
    };
  }, [isLiveCrmRoleSupported]);

  async function reloadHistory(filters = crmFilters) {
    await loadCrmHistory(filters);
  }

  async function runTrigger() {
    const ok = await triggerCrmExpiryReminder();
    if (ok) {
      await reloadHistory();
    }
  }

  async function runProcess() {
    const ok = await processCrmQueue();
    if (ok) {
      await reloadHistory();
    }
  }

  return (
    <section className="members-prototype-layout">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>CRM 메시지 프로토타입</h1>
            <p>queue/history query ownership과 trigger/process invalidation을 새 구조에서 검증합니다.</p>
          </div>
        </div>

        {!isLiveCrmRoleSupported ? (
          <div className="selected-member-card" style={{ marginBottom: 16 }}>
            <div className="selected-member-card-header">
              <div>
                <h2>이 역할은 live CRM 미지원</h2>
                <p>현재 live backend는 CRM trigger/process/history API를 관리자 또는 데스크 계정에만 열어두고 있습니다.</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="placeholder-card" style={{ marginBottom: 16 }}>
          <h2>메시지 트리거 / 큐 처리</h2>
          <div className="members-filter-grid">
            <label>
              만료임박 기준 (daysAhead)
              <input
                type="number"
                min={0}
                max={30}
                value={crmTriggerDaysAhead}
                disabled={!isLiveCrmRoleSupported}
                onChange={(event) => setCrmTriggerDaysAhead(event.target.value)}
              />
            </label>
            <div className="toolbar-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => void runTrigger()}
                disabled={crmTriggerSubmitting || !isLiveCrmRoleSupported}
              >
                {crmTriggerSubmitting ? "적재 중..." : "만료임박 트리거"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => void runProcess()}
                disabled={crmProcessSubmitting || !isLiveCrmRoleSupported}
              >
                {crmProcessSubmitting ? "처리 중..." : "큐 처리"}
              </button>
            </div>
          </div>
          {crmPanelMessage ? <p>{crmPanelMessage}</p> : null}
          {crmPanelError ? <p className="error-text">{crmPanelError}</p> : null}
        </div>

        <div className="placeholder-card">
          <h2>발송 이력 조회</h2>
          <form
            className="members-filter-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void reloadHistory();
            }}
          >
            <label>
              상태
              <select
                value={crmFilters.sendStatus}
                disabled={!isLiveCrmRoleSupported}
                onChange={(event) =>
                  setCrmFilters((prev) => ({
                    ...prev,
                    sendStatus: event.target.value as typeof prev.sendStatus
                  }))
                }
              >
                <option value="">전체</option>
                <option value="PENDING">PENDING</option>
                <option value="RETRY_WAIT">RETRY_WAIT</option>
                <option value="SENT">SENT</option>
                <option value="DEAD">DEAD</option>
              </select>
            </label>
            <label>
              limit
              <input
                type="number"
                min={1}
                max={500}
                value={crmFilters.limit}
                disabled={!isLiveCrmRoleSupported}
                onChange={(event) =>
                  setCrmFilters((prev) => ({
                    ...prev,
                    limit: event.target.value
                  }))
                }
              />
            </label>
            <div className="toolbar-actions">
              <button type="submit" className="primary-button" disabled={crmHistoryLoading || !isLiveCrmRoleSupported}>
                {crmHistoryLoading ? "조회 중..." : "조회"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  clearCrmFeedback();
                  const nextFilters = createDefaultCrmFilters();
                  setCrmFilters(nextFilters);
                  void reloadHistory(nextFilters);
                }}
              >
                초기화
              </button>
            </div>
          </form>

          {crmHistoryError ? <p className="error-text">{crmHistoryError}</p> : null}

          <div className="table-shell" style={{ marginTop: 12 }}>
            <table className="members-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>회원ID</th>
                  <th>회원권ID</th>
                  <th>이벤트</th>
                  <th>상태</th>
                  <th>시도횟수</th>
                  <th>마지막시도</th>
                  <th>다음시도</th>
                  <th>에러</th>
                  <th>생성일</th>
                </tr>
              </thead>
              <tbody>
                {historyPagination.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-cell">
                      {!isLiveCrmRoleSupported
                        ? "현재 역할에서는 live CRM 이력을 조회할 수 없습니다."
                        : crmHistoryLoading
                          ? "조회 중..."
                          : "메시지 이력이 없습니다."}
                    </td>
                  </tr>
                ) : (
                  historyPagination.pagedItems.map((row) => (
                    <tr key={row.crmMessageEventId}>
                      <td>{row.crmMessageEventId}</td>
                      <td>{row.memberId}</td>
                      <td>{row.membershipId ?? "-"}</td>
                      <td>{row.eventType}</td>
                      <td>{row.sendStatus}</td>
                      <td>{row.attemptCount}</td>
                      <td>{formatDateTime(row.lastAttemptedAt)}</td>
                      <td>{formatDateTime(row.nextAttemptAt)}</td>
                      <td>{row.lastErrorMessage ?? "-"}</td>
                      <td>{formatDate(row.createdAt.slice(0, 10))}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={historyPagination.page}
            totalPages={historyPagination.totalPages}
            pageSize={historyPagination.pageSize}
            pageSizeOptions={[10, 20, 50]}
            totalItems={historyPagination.totalItems}
            startItemIndex={historyPagination.startItemIndex}
            endItemIndex={historyPagination.endItemIndex}
            onPageChange={historyPagination.setPage}
            onPageSizeChange={historyPagination.setPageSize}
          />
        </div>
      </article>
    </section>
  );
}
