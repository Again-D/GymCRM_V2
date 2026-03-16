import { useCallback, useEffect } from "react";

import { usePagination } from "../../shared/hooks/usePagination";
import { PaginationControls } from "../../shared/ui/PaginationControls";
import { useSettlementPrototypeState } from "./modules/useSettlementPrototypeState";
import { useSettlementReportQuery } from "./modules/useSettlementReportQuery";
import { createDefaultSettlementFilters } from "./modules/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
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
          <span className="ops-eyebrow">정산 콘솔</span>
          <h1 className="ops-title">정산 리포트</h1>
          <p className="ops-subtitle">매출, 환불, 결제 수단별 집계를 빠르게 확인할 수 있는 정산 작업 화면입니다.</p>
          <div className="ops-meta">
            <span className="ops-meta__pill">매출 집계</span>
            <span className="ops-meta__pill">필터 기반 분석</span>
            <span className="ops-meta__pill">거래 요약</span>
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
          필터 초기화
        </button>
      </div>

      <div className="ops-kpi-grid">
        {[
          { label: "총 매출", value: formatCurrency(settlementReport?.totalGrossSales ?? 0), hint: "환불 차감 전 기준 매출" },
          { label: "총 환불", value: formatCurrency(settlementReport?.totalRefundAmount ?? 0), hint: "조회 구간 내 환불 금액" },
          { label: "순매출", value: formatCurrency(settlementReport?.totalNetSales ?? 0), hint: "환불을 제외한 순수 매출" },
          { label: "거래 건수", value: String(settlementReport?.rows.length ?? 0), hint: "리포트에 집계된 거래 행 수" }
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
              <h2 className="ops-section__title">리포트 조건</h2>
              <p className="ops-section__subtitle">조회 기간, 결제 수단, 상품 키워드를 조정해 결과를 확인합니다.</p>
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
              <span className="text-xs text-muted brand-title">시작일</span>
              <input
                className="input"
                type="date"
                value={settlementFilters.startDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">종료일</span>
              <input
                className="input"
                type="date"
                value={settlementFilters.endDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">결제 수단</span>
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
                <option value="">전체 결제 수단</option>
                <option value="CASH">현금</option>
                <option value="CARD">카드</option>
                <option value="TRANSFER">계좌이체</option>
                <option value="ETC">기타</option>
              </select>
            </label>
            <label className="stack-sm">
              <span className="text-xs text-muted brand-title">상품 검색</span>
              <input
                className="input"
                value={settlementFilters.productKeyword}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, productKeyword: event.target.value }))}
                placeholder="상품명 키워드"
              />
            </label>

            <button type="submit" className="primary-button full-span mt-sm" disabled={settlementReportLoading}>
              {settlementReportLoading ? "집계 중..." : "리포트 조회"}
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
              <h2 className="ops-section__title">거래 집계 결과</h2>
              <p className="ops-section__subtitle">상품과 결제 수단별로 총매출과 순매출을 비교합니다.</p>
            </div>
          </div>

          <div className="table-shell">
            <table className="members-table">
              <thead>
                <tr>
                  <th>상품 / 분류</th>
                  <th>결제 수단</th>
                  <th style={{ textAlign: 'right' }}>총매출</th>
                  <th style={{ textAlign: 'right' }}>순매출</th>
                </tr>
              </thead>
              <tbody>
                {rowsPagination.pagedItems.map((row) => (
                  <tr key={`${row.productName}-${row.paymentMethod}`}>
                    <td>
                      <div className="stack-sm">
                        <span className="text-sm brand-title">{row.productName}</span>
                        <span className="text-xs text-muted">{row.transactionCount}건 거래</span>
                      </div>
                    </td>
                    <td><span className="pill muted">{row.paymentMethod}</span></td>
                    <td className="ops-right">
                      <div className="stack-sm">
                        <span className="text-sm">{formatCurrency(row.grossSales)}</span>
                        {row.refundAmount > 0 && <span className="text-xs text-danger">-{formatCurrency(row.refundAmount)} 환불</span>}
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
                      {settlementReportLoading ? "정산 데이터를 집계하는 중..." : "현재 조건에 해당하는 거래가 없습니다."}
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
