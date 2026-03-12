import { useEffect } from "react";

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
  }, []);

  useEffect(() => {
    if (settlementReportMessage) {
      setSettlementPanelMessage(settlementReportMessage);
    }
  }, [settlementReportMessage, setSettlementPanelMessage]);

  useEffect(() => {
    setSettlementPanelError(settlementReportError);
  }, [setSettlementPanelError, settlementReportError]);

  async function reloadReport(filters = settlementFilters) {
    clearSettlementFeedback();
    await loadSettlementReport(filters);
  }

  return (
    <section className="members-prototype-layout">
      <article className="panel-card">
        <div className="panel-card-header">
          <div>
            <h1>정산 리포트 프로토타입</h1>
            <p>report query ownership, broad filter state, summary/table rendering을 새 구조에서 검증합니다.</p>
          </div>
        </div>

        <div className="placeholder-card" style={{ marginBottom: 16 }}>
          <h2>리포트 조건</h2>
          <form
            className="members-filter-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void reloadReport();
            }}
          >
            <label>
              시작일
              <input
                type="date"
                value={settlementFilters.startDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </label>
            <label>
              종료일
              <input
                type="date"
                value={settlementFilters.endDate}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </label>
            <label>
              결제수단
              <select
                value={settlementFilters.paymentMethod}
                onChange={(event) =>
                  setSettlementFilters((prev) => ({
                    ...prev,
                    paymentMethod: event.target.value as typeof prev.paymentMethod
                  }))
                }
              >
                <option value="">전체</option>
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="ETC">ETC</option>
              </select>
            </label>
            <label>
              상품명 키워드
              <input
                value={settlementFilters.productKeyword}
                onChange={(event) => setSettlementFilters((prev) => ({ ...prev, productKeyword: event.target.value }))}
                placeholder="예: PT 10회권"
              />
            </label>
            <div className="toolbar-actions">
              <button type="submit" className="primary-button" disabled={settlementReportLoading}>
                {settlementReportLoading ? "집계 중..." : "집계"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  resetSettlementWorkspace();
                  const nextFilters = createDefaultSettlementFilters();
                  void loadSettlementReport(nextFilters);
                }}
              >
                초기화
              </button>
            </div>
          </form>
          {settlementPanelMessage ? <p>{settlementPanelMessage}</p> : null}
          {settlementPanelError ? <p className="error-text">{settlementPanelError}</p> : null}
        </div>

        <div className="placeholder-card" style={{ marginBottom: 16 }}>
          <h2>정산 요약</h2>
          <dl className="detail-grid compact-detail-grid">
            <div>
              <dt>총 매출</dt>
              <dd>{formatCurrency(settlementReport?.totalGrossSales ?? 0)}</dd>
            </div>
            <div>
              <dt>총 환불</dt>
              <dd>{formatCurrency(settlementReport?.totalRefundAmount ?? 0)}</dd>
            </div>
            <div>
              <dt>순매출</dt>
              <dd>{formatCurrency(settlementReport?.totalNetSales ?? 0)}</dd>
            </div>
            <div>
              <dt>집계 행 수</dt>
              <dd>{settlementReport?.rows.length ?? 0}</dd>
            </div>
          </dl>
        </div>

        <div className="placeholder-card">
          <h2>상품/결제수단 집계</h2>
          <div className="table-shell" style={{ marginTop: 12 }}>
            <table className="members-table">
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>결제수단</th>
                  <th>총매출</th>
                  <th>환불</th>
                  <th>순매출</th>
                  <th>건수</th>
                </tr>
              </thead>
              <tbody>
                {rowsPagination.pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      {settlementReportLoading ? "집계 중..." : "집계 데이터가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  rowsPagination.pagedItems.map((row) => (
                    <tr key={`${row.productName}-${row.paymentMethod}`}>
                      <td>{row.productName}</td>
                      <td>{row.paymentMethod}</td>
                      <td>{formatCurrency(row.grossSales)}</td>
                      <td>{formatCurrency(row.refundAmount)}</td>
                      <td>{formatCurrency(row.netSales)}</td>
                      <td>{row.transactionCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={rowsPagination.page}
            totalPages={rowsPagination.totalPages}
            pageSize={rowsPagination.pageSize}
            pageSizeOptions={[10, 20, 50]}
            totalItems={rowsPagination.totalItems}
            startItemIndex={rowsPagination.startItemIndex}
            endItemIndex={rowsPagination.endItemIndex}
            onPageChange={rowsPagination.setPage}
            onPageSizeChange={rowsPagination.setPageSize}
          />
        </div>
      </article>
    </section>
  );
}
