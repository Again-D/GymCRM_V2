import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FoundationProviders } from "../../app/providers";
import SettlementsPage from "./SettlementsPage";
import type { SettlementReportFilters, TrainerPayrollFilters } from "./modules/types";

const clientMocks = vi.hoisted(() => ({
  apiDownload: vi.fn(),
  apiPost: vi.fn(),
  mockApiMode: true
}));

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    apiDownload: clientMocks.apiDownload,
    apiPost: clientMocks.apiPost,
    isMockApiMode: () => clientMocks.mockApiMode
  };
});

const refetchSalesDashboard = vi.fn();
const refetchSettlementReport = vi.fn();
const refetchRecentAdjustments = vi.fn();
const resetSettlementWorkspace = vi.fn();
const clearSettlementFeedback = vi.fn();
const setSettlementFilters = vi.fn();
const setSettlementPanelMessage = vi.fn();
const setSettlementPanelError = vi.fn();
const refetchTrainerPayroll = vi.fn();
const setTrainerPayrollFilters = vi.fn();
const setTrainerPayrollPanelMessage = vi.fn();
const setTrainerPayrollPanelError = vi.fn();
const clearTrainerPayrollFeedback = vi.fn();
const submitTrainerPayrollFilters = vi.fn();
const resetTrainerPayrollWorkspace = vi.fn();
const refetchTrainerMonthlyPtSummary = vi.fn();

let mockSettlementFilters: SettlementReportFilters = {
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  paymentMethod: "",
  productKeyword: "",
  trendGranularity: "DAILY"
};
let mockTrainerPayrollFilters: TrainerPayrollFilters = {
  settlementMonth: "2026-03",
  sessionUnitPrice: "50000"
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

vi.mock("./modules/useTrainerPayrollPrototypeState", () => ({
  useTrainerPayrollPrototypeState: () => ({
    trainerPayrollFilters: mockTrainerPayrollFilters,
    setTrainerPayrollFilters,
    submittedTrainerPayrollQuery: {
      settlementMonth: "2026-03",
      sessionUnitPrice: 50000
    },
    trainerPayrollPanelMessage: null,
    setTrainerPayrollPanelMessage,
    trainerPayrollPanelError: null,
    setTrainerPayrollPanelError,
    clearTrainerPayrollFeedback,
    submitTrainerPayrollFilters,
    resetTrainerPayrollWorkspace
  })
}));

vi.mock("./modules/useTrainerPayrollQuery", () => ({
  useTrainerPayrollQuery: () => ({
    trainerPayroll: {
      settlementMonth: "2026-03",
      sessionUnitPrice: 50000,
      totalCompletedClassCount: 3,
      totalPayrollAmount: 150000,
      settlementStatus: "DRAFT",
      confirmedAt: null,
      rows: [
        {
          settlementId: null,
          trainerUserId: 41,
          trainerName: "정트레이너",
          completedClassCount: 2,
          sessionUnitPrice: 50000,
          payrollAmount: 100000
        },
        {
          settlementId: null,
          trainerUserId: 42,
          trainerName: "김트레이너",
          completedClassCount: 1,
          sessionUnitPrice: 50000,
          payrollAmount: 50000
        }
      ]
    },
    trainerPayrollLoading: false,
    trainerPayrollError: null,
    trainerPayrollMessage: "ok",
    refetchTrainerPayroll
  })
}));

vi.mock("./modules/useTrainerMonthlyPtSummaryQuery", () => ({
  useTrainerMonthlyPtSummaryQuery: () => ({
    trainerMonthlyPtSummary: {
      settlementMonth: "2026-03",
      trainerUserId: 41,
      trainerName: "정트레이너",
      completedClassCount: 2
    },
    trainerMonthlyPtSummaryLoading: false,
    trainerMonthlyPtSummaryError: null,
    trainerMonthlyPtSummaryMessage: "ok",
    refetchTrainerMonthlyPtSummary
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
    mockTrainerPayrollFilters = {
      settlementMonth: "2026-03",
      sessionUnitPrice: "50000"
    };
    refetchSalesDashboard.mockReset();
    refetchSettlementReport.mockReset();
    refetchRecentAdjustments.mockReset();
    refetchTrainerPayroll.mockReset();
    resetSettlementWorkspace.mockReset();
    clearSettlementFeedback.mockReset();
    setSettlementFilters.mockReset();
    setSettlementPanelMessage.mockReset();
    setSettlementPanelError.mockReset();
    setTrainerPayrollFilters.mockReset();
    setTrainerPayrollPanelMessage.mockReset();
    setTrainerPayrollPanelError.mockReset();
    clearTrainerPayrollFeedback.mockReset();
    submitTrainerPayrollFilters.mockReset();
    resetTrainerPayrollWorkspace.mockReset();
    refetchTrainerMonthlyPtSummary.mockReset();
    clientMocks.apiDownload.mockReset();
    clientMocks.apiPost.mockReset();
    clientMocks.mockApiMode = true;
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
    vi.stubGlobal("URL", Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn()
    }));
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
    expect(screen.getByText("월 정산 조회")).toBeTruthy();
    expect(screen.getByText("월 정산 확정")).toBeTruthy();
    expect(screen.getByText("정산서 출력")).toBeTruthy();
    expect(screen.getByText("정트레이너")).toBeTruthy();
    expect(screen.queryByText("Invalid Date")).toBeNull();
  });

  it("renders trainer mini view with monthly pt summary for trainer actors", async () => {
    render(
      <FoundationProviders
        authValue={{
          authUser: {
            userId: 41,
            centerId: 1,
            username: "trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"]
          }
        }}
      >
        <SettlementsPage />
      </FoundationProviders>
    );

    expect(screen.getByText("내 월간 PT 실적")).toBeTruthy();
    expect(screen.getByText("트레이너 전용 미니뷰")).toBeTruthy();
    expect(screen.getByText("완료 PT 수업 수")).toBeTruthy();
    expect(screen.getByText("정트레이너")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "매출 분석" })).toBeNull();
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

  it("downloads sales report as xlsx with current filters", async () => {
    clientMocks.mockApiMode = false;
    clientMocks.apiDownload.mockResolvedValue({
      blob: new Blob(["xlsx"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      }),
      filename: "sales-report-2026-03-01-to-2026-03-31.xlsx"
    });

    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    fireEvent.click(screen.getByRole("button", { name: "Excel 다운로드" }));

    await waitFor(() => {
      expect(clientMocks.apiDownload).toHaveBeenCalledWith(
        "/api/v1/settlements/sales-report/export?startDate=2026-03-01&endDate=2026-03-31&trendGranularity=DAILY"
      );
    });
  });
});
