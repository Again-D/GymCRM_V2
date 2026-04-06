import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FoundationProviders } from "../../app/providers";
import SettlementsPage from "./SettlementsPage";
import type { SettlementReportFilters } from "./modules/types";

const refetchSalesDashboard = vi.fn();
const refetchSettlementReport = vi.fn();
const refetchRecentAdjustments = vi.fn();
const resetSettlementWorkspace = vi.fn();
const clearSettlementFeedback = vi.fn();
const setSettlementFilters = vi.fn();
const setSettlementPanelMessage = vi.fn();
const setSettlementPanelError = vi.fn();

let mockSettlementFilters: SettlementReportFilters = {
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  paymentMethod: "",
  productKeyword: "",
  trendGranularity: "DAILY"
};

vi.mock("./modules/useSettlementPrototypeState", () => ({
  useSettlementPrototypeState: () => ({
    settlementFilters: mockSettlementFilters,
    setSettlementFilters,
    settlementPanelMessage: null,
    setSettlementPanelMessage,
    settlementPanelError: null,
    setSettlementPanelError,
    clearSettlementFeedback,
    resetSettlementWorkspace
  })
}));

vi.mock("./modules/useSalesDashboardQuery", () => ({
  useSalesDashboardQuery: () => ({
    salesDashboard: {
      baseDate: "2026-03-31",
      expiringWithinDays: 7,
      todayNetSales: 100000,
      monthNetSales: 3000000,
      newMemberCount: 3,
      expiringMemberCount: 5,
      refundCount: 2
    },
    salesDashboardLoading: false,
    salesDashboardError: null,
    refetchSalesDashboard
  })
}));

vi.mock("./modules/useSettlementReportQuery", () => ({
  useSettlementReportQuery: () => ({
    settlementReport: {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: null,
      productKeyword: null,
      trendGranularity: "DAILY",
      totalGrossSales: 100000,
      totalRefundAmount: 20000,
      totalNetSales: 80000,
      trend: [
        {
          bucketStartDate: "2026-03-31",
          bucketLabel: "2026-03-31",
          grossSales: 100000,
          refundAmount: 20000,
          netSales: 80000,
          transactionCount: 1
        }
      ],
      rows: [
        {
          productName: "PT 10회권",
          paymentMethod: "CARD",
          grossSales: 100000,
          refundAmount: 20000,
          netSales: 80000,
          transactionCount: 1
        }
      ]
    },
    settlementReportLoading: false,
    settlementReportError: null,
    settlementReportMessage: "ok",
    refetchSettlementReport
  })
}));

vi.mock("./modules/useSettlementRecentAdjustmentsQuery", () => ({
  useSettlementRecentAdjustmentsQuery: () => ({
    recentAdjustments: [
      {
        paymentId: 1,
        adjustmentType: "REFUND",
        productName: "PT 10회권",
        memberName: "김민수",
        paymentMethod: "CARD",
        amount: 20000,
        paidAt: "2026-03-31T10:00:00+09:00",
        memo: null,
        approvalRef: null
      }
    ],
    recentAdjustmentsLoading: false,
    recentAdjustmentsError: null,
    recentAdjustmentsMessage: "ok",
    refetchRecentAdjustments
  })
}));

describe("SettlementsPage", () => {
  beforeEach(() => {
    mockSettlementFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "",
      productKeyword: "",
      trendGranularity: "DAILY"
    };
    refetchSalesDashboard.mockReset();
    refetchSettlementReport.mockReset();
    refetchRecentAdjustments.mockReset();
    resetSettlementWorkspace.mockReset();
    clearSettlementFeedback.mockReset();
    setSettlementFilters.mockReset();
    setSettlementPanelMessage.mockReset();
    setSettlementPanelError.mockReset();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders sales analytics tab by default in mock mode", () => {
    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    expect(screen.getByRole("heading", { name: "정산 운영 센터" })).toBeTruthy();
    expect(screen.getByRole("tab", { selected: true, name: "매출 분석" })).toBeTruthy();
    expect(screen.getByText("리포트 조건")).toBeTruthy();
    expect(screen.getByText("기간 추이 리포트")).toBeTruthy();
    expect(screen.getByText("최근 환불")).toBeTruthy();
  }, 15_000);

  it("switches to trainer payroll tab", async () => {
    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    fireEvent.click(await screen.findByRole("tab", { name: "트레이너 정산" }));

    expect(screen.getByRole("tab", { selected: true, name: "트레이너 정산" })).toBeTruthy();
    expect(screen.getByText("트레이너 정산 조회 기능은 다음 구현 단위에서 연결됩니다.")).toBeTruthy();
    expect(screen.queryByText("Invalid Date")).toBeNull();
  });

  it("does not force an immediate refetch before reset state is applied", async () => {
    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    fireEvent.click(screen.getByText("필터 초기화"));

    expect(resetSettlementWorkspace).toHaveBeenCalledTimes(1);
    expect(refetchSalesDashboard).not.toHaveBeenCalled();
    expect(refetchSettlementReport).not.toHaveBeenCalled();
    expect(refetchRecentAdjustments).not.toHaveBeenCalled();
  });
});
