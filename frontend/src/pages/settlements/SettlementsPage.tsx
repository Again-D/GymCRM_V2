import { useCallback, useEffect } from "react";

import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useSettlementPrototypeState } from "./modules/useSettlementPrototypeState";
import { useSettlementReportQuery } from "./modules/useSettlementReportQuery";
import { createDefaultSettlementFilters } from "./modules/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export default function SettlementsPage() {
  const {
    settlementFilters,
    setSettlementFilters,
    settlementPanelMessage,
    setSettlementPanelMessage,
    settlementPanelError,
    setSettlementPanelError,
    clearSettlementFeedback,
    resetSettlementWorkspace
  } = useSettlementPrototypeState();
  
  const {
    settlementReport,
    settlementReportLoading,
    settlementReportError,
    settlementReportMessage,
    loadSettlementReport,
    resetSettlementReportQuery
  } = useSettlementReportQuery({
    getDefaultFilters: createDefaultSettlementFilters
  });

  const rowsPagination = usePagination(settlementReport?.rows ?? [], {
    initialPageSize: 10,
    resetDeps: [settlementReport?.rows.length ?? 0, settlementFilters.startDate, settlementFilters.endDate, settlementFilters.paymentMethod, settlementFilters.productKeyword]
  });

  useEffect(() => {
    void loadSettlementReport(settlementFilters);
    return () => {
      resetSettlementReportQuery();
    };
  }, [loadSettlementReport, resetSettlementReportQuery, settlementFilters]);

  useEffect(() => {
    if (settlementReportMessage) {
      setSettlementPanelMessage(settlementReportMessage);
    }
  }, [settlementReportMessage, setSettlementPanelMessage]);

  useEffect(() => {
    setSettlementPanelError(settlementReportError);
  }, [setSettlementPanelError, settlementReportError]);

  const reloadReport = useCallback(async (filters = settlementFilters) => {
    clearSettlementFeedback();
    await loadSettlementReport(filters);
  }, [clearSettlementFeedback, loadSettlementReport, settlementFilters]);

  return (
    <section className="ops-shell">
      <div className="ops-hero">
        <div className="ops-hero__copy">
          <span className="ops-eyebrow">Financial Console</span>
          <h1 className="ops-title">Settlement Intelligence</h1>
          <p className="ops-subtitle">Inspect revenue, refunds, and transaction mix with a reporting surface tuned for desk-level operational review.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">Financial rollup</span>
            <span className="ops-meta__pill">Filter-driven analysis</span>
            <span className="ops-meta__pill">Transaction aggregation</span>
          </div>
        </div>
        <button
          type="button"
          className="secondary-button ops-action-button"
          onClick={() => {
            resetSettlementWorkspace();
            const nextFilters = createDefaultSettlementFilters();
            void loadSettlementReport(nextFilters);
          }}
        >
          Reset Filters
        </button>
      </div>

      <div className="ops-kpi-grid">
        {[
          { label: "Gross Sales", value: formatCurrency(settlementReport?.totalGrossSales ?? 0), hint: "Before refunds and offsets" },
          { label: "Total Refund", value: formatCurrency(settlementReport?.totalRefundAmount ?? 0), hint: "Refunded amount within the selected range" },
          { label: "Net Revenue", value: formatCurrency(settlementReport?.totalNetSales ?? 0), hint: "Gross sales less refunds" },
          { label: "Trans. Count", value: String(settlementReport?.rows.length ?? 0), hint: "Aggregated transaction rows loaded into the report" }
        ].map((kpi) => (
          <div key={kpi.label} className="ops-kpi-card">
            <span className="ops-kpi-card__label">{kpi.label}</span>
            <span className="ops-kpi-card__value">{kpi.value}</span>
            <span className="ops-kpi-card__hint">{kpi.hint}</span>
          </div>
        ))}
      </div>

      {/* FILTER & DATA CONSOLE */}
      <section className="ops-surface-grid ops-surface-grid--narrow-sidebar">
        
        {/* PARAMS PANEL */}
        <article className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">Report Parameters</h2>
              <p className="ops-section__subtitle">Adjust date range, payment method, and product keyword filters.</p>
            </div>
          </div>
          
          <form
            className="stack-md"
            onSubmit={(event) => {
              event.preventDefault();
              void reloadReport();
            }}
          >
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">Period Start</span>
              <input
                className="input"
                type="date"
                value={settlementFilters.startDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">Period End</span>
              <input
                className="input"
                type="date"
                value={settlementFilters.endDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">Payment Method</span>
              <select
                className="input"
                value={settlementFilters.paymentMethod}
                onChange={(event) =>
                  setSettlementFilters((prev) => ({
                    ...prev,
                    paymentMethod: event.target.value as typeof prev.paymentMethod
                  }))
                }
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="TRANSFER">Transfer</option>
                <option value="ETC">Other</option>
              </select>
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">Search Product</span>
              <input
                className="input"
                value={settlementFilters.productKeyword}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, productKeyword: event.target.value }))}
                placeholder="Item name keyword..."
              />
            </label>

            <button type="submit" className="primary-button full-span mt-sm" disabled={settlementReportLoading}>
              {settlementReportLoading ? "Calculating..." : "Generate Analysis"}
            </button>
          </form>

          {(settlementPanelMessage || settlementPanelError) && (
            <div className="ops-feedback-stack mt-md">
              {settlementPanelMessage && <div className="pill ok full-span">{settlementPanelMessage}</div>}
              {settlementPanelError && <div className="pill danger full-span">{settlementPanelError}</div>}
            </div>
          )}
        </article>

        {/* DATA TABLE PANEL */}
        <article className="panel-card">
          <div className="ops-section__header">
            <div>
              <h2 className="ops-section__title">Transaction Aggregation</h2>
              <p className="ops-section__subtitle">Compare gross and net figures by product and payment method.</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Product / Category</th>
                  <th>Method</th>
                  <th style={{ textAlign: 'right' }}>Revenue (Gross)</th>
                  <th style={{ textAlign: 'right' }}>Net Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rowsPagination.pagedItems.map((row) => (
                  <tr key={`${row.productName}-${row.paymentMethod}`}>
                    <td>
                      <div className="stack-sm">
                        <span className="text-sm brand-title">{row.productName}</span>
                        <span className="text-xs text-muted">{row.transactionCount} transactions</span>
                      </div>
                    </td>
                    <td><span className="pill muted">{row.paymentMethod}</span></td>
                    <td className="ops-right">
                      <div className="stack-sm">
                        <span className="text-sm">{formatCurrency(row.grossSales)}</span>
                        {row.refundAmount > 0 && <span className="text-xs text-danger">-{formatCurrency(row.refundAmount)} refund</span>}
                      </div>
                    </td>
                    <td className="ops-right">
                      <span className="text-sm brand-title" style={{ color: 'var(--status-ok)' }}>{formatCurrency(row.netSales)}</span>
                    </td>
                  </tr>
                ))}
                {rowsPagination.pagedItems.length === 0 && (
                   <tr>
                    <td colSpan={4} className="empty-cell">
                      {settlementReportLoading ? "Processing financial data..." : "No records found for current range."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-md">
            <PaginationControls {...rowsPagination} pageSizeOptions={[10, 20]} onPageChange={rowsPagination.setPage} onPageSizeChange={rowsPagination.setPageSize} />
          </div>
        </article>
      </section>
    </section>
  );
}
