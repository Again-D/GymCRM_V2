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
    <div className="stack-lg">
      
      {/* OPERATIONS CONSOLE */}
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h1 className="brand-title" style={{ fontSize: '1.25rem' }}>Communication Ops</h1>
            <p className="text-muted text-xs">Automated messaging queues and transmission logs.</p>
          </div>
          <div className="row-actions">
            <button
               type="button"
               className="secondary-button"
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
        </header>

        <div className="members-page-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 1.5fr', gap: '24px' }}>
          
          {/* TRIGGER CONTROL */}
          <div className="panel-card" style={{ background: 'var(--bg-base)', border: '0' }}>
            <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>QUEUE AUTOMATION</span>
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
                    style={{ flex: 1 }}
                    onClick={() => void runTrigger()}
                    disabled={crmTriggerSubmitting || !isLiveCrmRoleSupported}
                  >
                    {crmTriggerSubmitting ? "Queueing..." : "Scan & Load Queue"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ flex: 1 }}
                    onClick={() => void runProcess()}
                    disabled={crmProcessSubmitting || !isLiveCrmRoleSupported}
                  >
                    {crmProcessSubmitting ? "Sending..." : "Process Queue"}
                  </button>
               </div>
            </div>
          </div>

          {/* STATUS MONITOR */}
          <div className="panel-card" style={{ background: 'var(--bg-base)', border: '0' }}>
             <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>OPERATIONAL FEEDBACK</span>
             <div className="stack-sm mt-sm">
                {!isLiveCrmRoleSupported && (
                  <div className="pill danger full-span" style={{ background: 'transparent', border: '1px dashed' }}>Role Restricted: Live API Disabled</div>
                )}
                {crmPanelMessage && <div className="pill ok full-span" style={{ justifyContent: 'center' }}>{crmPanelMessage}</div>}
                {crmPanelError && <div className="pill danger full-span" style={{ justifyContent: 'center' }}>{crmPanelError}</div>}
                {!crmPanelMessage && !crmPanelError && (
                  <p className="text-muted text-sm" style={{ fontStyle: 'italic' }}>System idle. Awaiting tactical commands.</p>
                )}
             </div>
          </div>
        </div>
      </article>

      {/* HISTORY TABLE */}
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <h2 className="brand-title" style={{ fontSize: '1rem' }}>Audit Logs & Transmission History</h2>
           <div className="row-actions">
              <select
                className="input"
                style={{ padding: '6px 10px', fontSize: '12px', width: 'auto' }}
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
        </header>

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
                        <span className="text-sm" style={{ fontWeight: 600 }}>Member ID: #{row.memberId}</span>
                        <span className="text-xs text-muted">Log: #{row.crmMessageEventId}</span>
                      </div>
                    </td>
                    <td><span className="text-xs" style={{ fontWeight: 700 }}>{row.eventType}</span></td>
                    <td><span className={status.class}>{status.label}</span></td>
                    <td>
                      <div className="stack-sm">
                        <span className="text-xs">{row.attemptCount} / 3</span>
                        {row.lastErrorMessage && <span className="text-xs text-danger" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.lastErrorMessage}</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="text-xs text-muted">{formatDateTime(row.createdAt)}</span>
                    </td>
                  </tr>
                );
              })}
              {historyPagination.pagedItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell" style={{ padding: '48px' }}>
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

    </div>
  );
}
