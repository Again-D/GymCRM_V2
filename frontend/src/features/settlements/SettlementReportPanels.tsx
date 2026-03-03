import type { Dispatch, FormEvent, SetStateAction } from "react";
import { EmptyTableRow } from "../../shared/ui/EmptyTableRow";
import { NoticeText } from "../../shared/ui/NoticeText";
import { PanelHeader } from "../../shared/ui/PanelHeader";
import { formatCurrency } from "../../shared/utils/format";

type SettlementReportFilterState = {
  startDate: string;
  endDate: string;
  paymentMethod: "" | "CASH" | "CARD" | "TRANSFER" | "ETC";
  productKeyword: string;
};

type SettlementReportRow = {
  productName: string;
  paymentMethod: string;
  grossSales: number;
  refundAmount: number;
  netSales: number;
  transactionCount: number;
};

type SettlementReportSummary = {
  totalGrossSales: number;
  totalRefundAmount: number;
  totalNetSales: number;
  rows: SettlementReportRow[];
};

type SettlementReportPanelsProps = {
  settlementFilters: SettlementReportFilterState;
  setSettlementFilters: Dispatch<SetStateAction<SettlementReportFilterState>>;
  loadSettlementReport: (filters?: SettlementReportFilterState) => Promise<void>;
  settlementReportLoading: boolean;
  settlementReport: SettlementReportSummary | null;
  settlementPanelMessage: string | null;
  settlementPanelError: string | null;
};

export function SettlementReportPanels({
  settlementFilters,
  setSettlementFilters,
  loadSettlementReport,
  settlementReportLoading,
  settlementReport,
  settlementPanelMessage,
  settlementPanelError
}: SettlementReportPanelsProps) {
  function handleReset() {
    const today = new Date().toISOString().slice(0, 10);
    const firstDay = `${today.slice(0, 8)}01`;
    const initialFilters: SettlementReportFilterState = {
      startDate: firstDay,
      endDate: today,
      paymentMethod: "",
      productKeyword: ""
    };
    setSettlementFilters(initialFilters);
    void loadSettlementReport(initialFilters);
  }

  return (
    <>
      <article className="panel">
        <PanelHeader title="정산 리포트 조건" />
        <form
          className="toolbar-grid products-toolbar-grid"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            void loadSettlementReport();
          }}
        >
          <label>
            시작일 *
            <input
              type="date"
              value={settlementFilters.startDate}
              onChange={(event) => setSettlementFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              required
            />
          </label>
          <label>
            종료일 *
            <input
              type="date"
              value={settlementFilters.endDate}
              onChange={(event) => setSettlementFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              required
            />
          </label>
          <label>
            결제수단
            <select
              value={settlementFilters.paymentMethod}
              onChange={(event) =>
                setSettlementFilters((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value as SettlementReportFilterState["paymentMethod"]
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
              placeholder="예: PT 10회"
            />
          </label>

          <div className="toolbar-actions">
            <button type="submit" className="primary-button" disabled={settlementReportLoading}>
              {settlementReportLoading ? "집계 중..." : "집계"}
            </button>
            <button type="button" className="secondary-button" onClick={handleReset}>
              초기화
            </button>
          </div>
        </form>

        {settlementPanelMessage ? <NoticeText tone="success">{settlementPanelMessage}</NoticeText> : null}
        {settlementPanelError ? <NoticeText tone="error">{settlementPanelError}</NoticeText> : null}
      </article>

      <article className="panel">
        <PanelHeader title="정산 요약" />
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
      </article>

      <article className="panel">
        <PanelHeader title="상품/결제수단 집계" />
        <div className="list-shell">
          <table>
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
              {!settlementReport || settlementReport.rows.length === 0 ? (
                <EmptyTableRow colSpan={6} message={settlementReportLoading ? "집계 중..." : "집계 데이터가 없습니다."} />
              ) : (
                settlementReport.rows.map((row) => (
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
      </article>
    </>
  );
}
