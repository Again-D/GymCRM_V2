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

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

const statusMap: Record<string, { label: string; class: string }> = {
  "SENT": { label: "SENT", class: "pill ok" },
  "PENDING": { label: "PENDING", class: "pill info" },
  "RETRY_WAIT": { label: "RETRYING", class: "pill warn" },
  "DEAD": { label: "FAILED", class: "pill danger" }
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
          <span className="ops-eyebrow">Messaging Queue</span>
          <h1 className="ops-title">Communication Ops</h1>
          <p className="ops-subtitle">Trigger reminder batches, process outbound messages, and audit delivery state from a single control surface.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">Queue automation</span>
            <span className="ops-meta__pill">Transmission audit</span>
            <span className="ops-meta__pill">Role-aware live gating</span>
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
          Sync Logs
        </button>
      </div>

      <div className="ops-kpi-grid">
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Total Events</span>
          <span className="ops-kpi-card__value">{crmHistoryRows.length}</span>
          <span className="ops-kpi-card__hint">Visible CRM transmissions in the current log view</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Pending Queue</span>
          <span className="ops-kpi-card__value">{pendingCount}</span>
          <span className="ops-kpi-card__hint">Messages still waiting for processing or retry</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Delivered</span>
          <span className="ops-kpi-card__value">{sentCount}</span>
          <span className="ops-kpi-card__hint">Successfully sent rows in the current set</span>
        </div>
        <div className="ops-kpi-card">
          <span className="ops-kpi-card__label">Failed</span>
          <span className="ops-kpi-card__value">{failedCount}</span>
          <span className="ops-kpi-card__hint">Rows that still require manual attention</span>
        </div>
      </div>

      <article className="panel-card">
        <div className="ops-surface-grid">
          <div className="ops-block">
            <span className="ops-kpi-card__label">Queue Automation</span>
            <div className="stack-md mt-sm">
               <label className="stack-sm">
                 <span className="text-sm">Days Ahead (Expiry)</span>
                 <input
                   className="input"
                   type="number"
                   min={0}
                   max={30}
                   value={crmTriggerDaysAhead}
                   disabled={!isLiveCrmRoleSupported}
                   onChange={(event) => setCrmTriggerDaysAhead(event.target.value)}
                 />
               </label>
               <div className="row-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => void runTrigger()}
                    disabled={crmTriggerSubmitting || !isLiveCrmRoleSupported}
                  >
                    {crmTriggerSubmitting ? "Queueing..." : "Scan & Load Queue"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void runProcess()}
                    disabled={crmProcessSubmitting || !isLiveCrmRoleSupported}
                  >
                    {crmProcessSubmitting ? "Sending..." : "Process Queue"}
                  </button>
               </div>
            </div>
          </div>

          {/* STATUS MONITOR */}
          <div className="ops-block">
             <span className="ops-kpi-card__label">Operational Feedback</span>
             <div className="ops-feedback-stack mt-sm">
                {!isLiveCrmRoleSupported && (
                  <div className="field-ops-note field-ops-note--restricted">
                    <span className="field-ops-note__label">Restricted live mode</span>
                    <div className="text-sm brand-title mt-xs">Role Restricted: Live API Disabled</div>
                    <div className="mt-xs text-sm">This role can review the workspace but cannot run live CRM queue actions.</div>
                  </div>
                )}
                {crmPanelMessage && <div className="pill ok full-span">{crmPanelMessage}</div>}
                {crmPanelError && <div className="pill danger full-span">{crmPanelError}</div>}
                {!crmPanelMessage && !crmPanelError && (
                  <p className="text-muted text-sm">System idle. Awaiting tactical commands.</p>
                )}
             </div>
          </div>
        </div>
      </article>

      {/* HISTORY TABLE */}
      <article className="panel-card">
        <div className="ops-section__header">
          <div>
            <h2 className="ops-section__title">Audit Logs & Transmission History</h2>
            <p className="ops-section__subtitle">Review outbound event state, retries, and recent failures.</p>
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
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="RETRY_WAIT">Retrying</option>
                <option value="SENT">Sent</option>
                <option value="DEAD">Failed</option>
              </select>
           </div>
        </div>

        <div className="table-shell">
          <table className="members-table">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Event Type</th>
                <th>Status</th>
                <th>Attempts</th>
                <th style={{ textAlign: 'right' }}>Logged At</th>
              </tr>
            </thead>
            <tbody>
              {historyPagination.pagedItems.map((row) => {
                const status = statusMap[row.sendStatus] || { label: row.sendStatus, class: 'pill muted' };
                return (
                  <tr key={row.crmMessageEventId}>
                    <td>
                      <div className="stack-sm">
                        <span className="text-sm brand-title">Member ID: #{row.memberId}</span>
                        <span className="text-xs text-muted">Log: #{row.crmMessageEventId}</span>
                      </div>
                    </td>
                    <td><span className="text-xs brand-title">{row.eventType}</span></td>
                    <td><span className={status.class}>{status.label}</span></td>
                    <td>
                      <div className="stack-sm">
                        <span className="text-xs">{row.attemptCount} / 3</span>
                        {row.lastErrorMessage && <span className="text-xs text-danger">{row.lastErrorMessage}</span>}
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
                    {crmHistoryLoading ? "Decoding logs..." : "No transmission data found."}
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
