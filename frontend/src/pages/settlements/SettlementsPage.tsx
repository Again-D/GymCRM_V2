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
    <div className="stack-lg">
      
      {/* HEADER & SUMMARY KPIS */}
      <article className="panel-card">
        <header className="panel-card-header mb-md">
          <div>
            <h1 className="brand-title" style={{ fontSize: '1.25rem' }}>Settlement Intelligence</h1>
            <p className="text-muted text-xs">Consolidated financial reporting and transaction auditing.</p>
          </div>
          <div className="row-actions">
             <button
                type="button"
                className="secondary-button"
                style={{ fontSize: '12px' }}
                onClick={() => {
                  resetSettlementWorkspace();
                  const nextFilters = createDefaultSettlementFilters();
                  void loadSettlementReport(nextFilters);
                }}
              >
                Reset Filters
              </button>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: 'GROSS SALES', value: formatCurrency(settlementReport?.totalGrossSales ?? 0), color: 'var(--text-main)' },
            { label: 'TOTAL REFUND', value: formatCurrency(settlementReport?.totalRefundAmount ?? 0), color: 'var(--status-danger)' },
            { label: 'NET REVENUE', value: formatCurrency(settlementReport?.totalNetSales ?? 0), color: 'var(--status-ok)' },
            { label: 'TRANS. COUNT', value: settlementReport?.rows.length ?? 0, color: 'var(--status-info)' }
          ].map(kpi => (
            <div key={kpi.label} className="panel-card" style={{ padding: '20px', background: 'var(--bg-base)', border: '0' }}>
              <span className="text-xs" style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{kpi.label}</span>
              <div className="text-2xl brand-title mt-xs" style={{ color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>
      </article>

      {/* FILTER & DATA CONSOLE */}
      <section className="members-page-grid" style={{ gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* PARAMS PANEL */}
        <article className="panel-card">
          <header className="mb-md">
            <h2 className="brand-title" style={{ fontSize: '1rem' }}>Report Parameters</h2>
          </header>
          
          <form
            className="stack-md"
            onSubmit={(event) => {
              event.preventDefault();
              void reloadReport();
            }}
          >
            <label className="stack-sm">
              <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Period Start</span>
              <input
                className="input"
                type="date"
                value={settlementFilters.startDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Period End</span>
              <input
                className="input"
                type="date"
                value={settlementFilters.endDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Payment Method</span>
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
              <span className="text-xs text-muted" style={{ fontWeight: 600 }}>Search Product</span>
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
            <div className="mt-md">
              {settlementPanelMessage && <div className="pill ok full-span" style={{ justifyContent: 'center' }}>{settlementPanelMessage}</div>}
              {settlementPanelError && <div className="pill danger full-span" style={{ justifyContent: 'center' }}>{settlementPanelError}</div>}
            </div>
          )}
        </article>

        {/* DATA TABLE PANEL */}
        <article className="panel-card">
          <header className="mb-md">
            <h2 className="brand-title" style={{ fontSize: '1rem' }}>Transaction Aggregation</h2>
          </header>

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
                        <span className="text-sm" style={{ fontWeight: 600 }}>{row.productName}</span>
                        <span className="text-xs text-muted">{row.transactionCount} transactions</span>
                      </div>
                    </td>
                    <td><span className="pill muted">{row.paymentMethod}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="stack-sm">
                        <span className="text-sm">{formatCurrency(row.grossSales)}</span>
                        {row.refundAmount > 0 && <span className="text-xs text-danger">-{formatCurrency(row.refundAmount)} refund</span>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="text-sm brand-title" style={{ color: 'var(--status-ok)' }}>{formatCurrency(row.netSales)}</span>
                    </td>
                  </tr>
                ))}
                {rowsPagination.pagedItems.length === 0 && (
                   <tr>
                    <td colSpan={4} className="empty-cell" style={{ padding: '48px' }}>
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
    </div>
  );
}
