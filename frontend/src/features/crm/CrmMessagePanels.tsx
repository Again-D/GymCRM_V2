import type { Dispatch, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { formatDateTime } from "../../shared/utils/format";

type CrmHistoryRow = {
  crmMessageEventId: number;
  memberId: number;
  membershipId: number | null;
  eventType: string;
  channelType: string;
  sendStatus: "PENDING" | "RETRY_WAIT" | "SENT" | "DEAD";
  attemptCount: number;
  lastAttemptedAt: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  lastErrorMessage: string | null;
  traceId: string | null;
  createdAt: string;
};

type CrmFilters = {
  sendStatus: "" | "PENDING" | "RETRY_WAIT" | "SENT" | "DEAD";
  limit: string;
};

type CrmMessagePanelsProps = {
  crmHistoryRows: CrmHistoryRow[];
  crmHistoryLoading: boolean;
  crmFilters: CrmFilters;
  setCrmFilters: Dispatch<SetStateAction<CrmFilters>>;
  crmTriggerDaysAhead: string;
  setCrmTriggerDaysAhead: Dispatch<SetStateAction<string>>;
  crmTriggerSubmitting: boolean;
  crmProcessSubmitting: boolean;
  crmPanelMessage: string | null;
  crmPanelError: string | null;
  loadCrmHistory: (filters?: CrmFilters) => Promise<void>;
  triggerCrmExpiryReminder: () => Promise<void>;
  processCrmQueue: () => Promise<void>;
};

export function CrmMessagePanels({
  crmHistoryRows,
  crmHistoryLoading,
  crmFilters,
  setCrmFilters,
  crmTriggerDaysAhead,
  setCrmTriggerDaysAhead,
  crmTriggerSubmitting,
  crmProcessSubmitting,
  crmPanelMessage,
  crmPanelError,
  loadCrmHistory,
  triggerCrmExpiryReminder,
  processCrmQueue
}: CrmMessagePanelsProps) {
  return (
    <>
      <article className="panel">
        <PanelHeader title="CRM 메시지 트리거 / 큐 처리" />
        <div className="toolbar-grid products-toolbar-grid">
          <label>
            만료임박 기준 (daysAhead)
            <input
              type="number"
              min={0}
              max={30}
              value={crmTriggerDaysAhead}
              onChange={(event) => setCrmTriggerDaysAhead(event.target.value)}
            />
          </label>
          <div className="toolbar-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => void triggerCrmExpiryReminder()}
              disabled={crmTriggerSubmitting}
            >
              {crmTriggerSubmitting ? "적재 중..." : "만료임박 트리거"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => void processCrmQueue()}
              disabled={crmProcessSubmitting}
            >
              {crmProcessSubmitting ? "처리 중..." : "큐 처리"}
            </button>
          </div>
        </div>

        {crmPanelMessage ? <NoticeText tone="success">{crmPanelMessage}</NoticeText> : null}
        {crmPanelError ? <NoticeText tone="error">{crmPanelError}</NoticeText> : null}
      </article>

      <article className="panel">
        <PanelHeader title="발송 이력 조회" />
        <form
          className="toolbar-grid products-toolbar-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void loadCrmHistory();
          }}
        >
          <label>
            상태
            <select
              value={crmFilters.sendStatus}
              onChange={(event) =>
                setCrmFilters((prev) => ({
                  ...prev,
                  sendStatus: event.target.value as CrmFilters["sendStatus"]
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
              onChange={(event) => setCrmFilters((prev) => ({ ...prev, limit: event.target.value }))}
            />
          </label>
          <div className="toolbar-actions">
            <button type="submit" className="primary-button" disabled={crmHistoryLoading}>
              {crmHistoryLoading ? "조회 중..." : "조회"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                const resetFilters: CrmFilters = { sendStatus: "", limit: "100" };
                setCrmFilters(resetFilters);
                void loadCrmHistory(resetFilters);
              }}
            >
              초기화
            </button>
          </div>
        </form>

        <div className="list-shell">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>회원ID</th>
                <th>회원권ID</th>
                <th>이벤트</th>
                <th>상태</th>
                <th>시도횟수</th>
                <th>마지막시도</th>
                <th>에러</th>
                <th>traceId</th>
                <th>생성시각</th>
              </tr>
            </thead>
            <tbody>
              {crmHistoryRows.length === 0 ? (
                <EmptyTableRow colSpan={10} message={crmHistoryLoading ? "조회 중..." : "메시지 이력이 없습니다."} />
              ) : (
                crmHistoryRows.map((row) => (
                  <tr key={row.crmMessageEventId}>
                    <td>{row.crmMessageEventId}</td>
                    <td>{row.memberId}</td>
                    <td>{row.membershipId ?? "-"}</td>
                    <td>{row.eventType}</td>
                    <td>{row.sendStatus}</td>
                    <td>{row.attemptCount}</td>
                    <td>{row.lastAttemptedAt ? formatDateTime(row.lastAttemptedAt) : "-"}</td>
                    <td>{row.lastErrorMessage ?? "-"}</td>
                    <td>{row.traceId ?? "-"}</td>
                    <td>{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
