import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FoundationProviders } from "../../app/providers";
import SettlementsPage from "./SettlementsPage";
import type { SettlementReport, SettlementReportFilters, TrainerSettlementPreviewFilters, TrainerSettlementPreviewReport, TrainerSettlementWorkspace } from "./modules/types";

const clientMocks = vi.hoisted(() => ({
  apiDownload: vi.fn(),
  apiPost: vi.fn(),
  mockApiMode: true
}));

const authStateMock = vi.hoisted(() => ({
  authUser: {
    userId: 1,
    roleCode: "ROLE_MANAGER",
    primaryRole: "ROLE_MANAGER",
    roles: ["ROLE_MANAGER"]
  }
}));

const navigateMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock
  };
});

vi.mock("../../api/client", async () => {
  const actual = await vi.importActual<typeof import("../../api/client")>("../../api/client");
  return {
    ...actual,
    apiDownload: clientMocks.apiDownload,
    apiPost: clientMocks.apiPost,
    isMockApiMode: () => clientMocks.mockApiMode
  };
});

vi.mock("../../app/auth", async () => {
  const actual = await vi.importActual<typeof import("../../app/auth")>("../../app/auth");
  return {
    ...actual,
    useAuthState: () => authStateMock
  };
});

let mockSettlementFilters: SettlementReportFilters = {
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  paymentMethod: "",
  productKeyword: "",
  trendGranularity: "DAILY"
};

let mockSettlementReport: SettlementReport = {
  startDate: "2026-03-01",
  endDate: "2026-03-31",
  paymentMethod: null,
  productKeyword: null,
  trendGranularity: "DAILY" as const,
  totalGrossSales: 100000,
  totalRefundAmount: 20000,
  totalNetSales: 80000,
  trend: [
    {
      bucketStartDate: "2026-03-01",
      bucketLabel: "03/01",
      grossSales: 50000,
      refundAmount: 5000,
      netSales: 45000,
      transactionCount: 2
    },
    {
      bucketStartDate: "2026-03-02",
      bucketLabel: "03/02",
      grossSales: 50000,
      refundAmount: 15000,
      netSales: 35000,
      transactionCount: 3
    }
  ],
  rows: [
    {
      productName: "3개월 PT",
      paymentMethod: "CARD" as const,
      grossSales: 100000,
      refundAmount: 20000,
      netSales: 80000,
      transactionCount: 5
    }
  ]
};

let mockTrainerSettlementFilters: TrainerSettlementPreviewFilters = {
  trainerId: "ALL",
  settlementMonth: "2026-03"
};

let mockActiveSettlement: TrainerSettlementWorkspace | null = null;
let mockTrainerSettlementPreview: TrainerSettlementPreviewReport = {
  settlementMonth: "2026-03",
  scope: {
    trainerId: "ALL",
    trainerName: "전체 트레이너"
  },
  period: {
    start: "2026-03-01",
    end: "2026-03-31"
  },
  summary: {
    totalSessions: 21,
    completedSessions: 21,
    cancelledSessions: 0,
    noShowSessions: 0,
    totalAmount: 1230000,
    hasRateWarnings: false
  },
  conflict: {
    hasConflict: false,
    createAllowed: true
  },
  rows: [
    {
      trainerUserId: 41,
      trainerName: "정트레이너",
      totalSessions: 12,
      completedSessions: 12,
      cancelledSessions: 0,
      noShowSessions: 0,
      ptSessions: 12,
      gxSessions: 0,
      ptRatePerSession: 50000,
      gxRatePerSession: 30000,
      ptAmount: 600000,
      gxAmount: 0,
      totalAmount: 600000,
      hasRateWarning: false,
      rateWarningMessage: null
    }
  ]
};

const setSettlementFilters = vi.fn();
const setSettlementPanelMessage = vi.fn();
const setSettlementPanelError = vi.fn();
const clearSettlementFeedback = vi.fn();
const resetSettlementWorkspace = vi.fn();
const setTrainerSettlementFilters = vi.fn();
const setTrainerSettlementPanelMessage = vi.fn();
const setTrainerSettlementPanelError = vi.fn();
const clearTrainerSettlementFeedback = vi.fn();
const submitTrainerSettlementFilters = vi.fn(() => mockTrainerSettlementFilters);
const applyTrainerSettlementPreset = vi.fn();
const syncCreatedSettlement = vi.fn();
const markSettlementConfirmed = vi.fn();
const resetTrainerSettlementWorkspace = vi.fn();

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
    refetchSalesDashboard: vi.fn()
  })
}));

vi.mock("./modules/useSettlementReportQuery", () => ({
  useSettlementReportQuery: () => ({
    settlementReport: mockSettlementReport,
    settlementReportLoading: false,
    settlementReportError: null,
    settlementReportMessage: null,
    refetchSettlementReport: vi.fn()
  })
}));

vi.mock("./components/SettlementSalesTrendChart", () => ({
  SettlementSalesTrendChart: ({ chartData, loading }: { chartData: { points: Array<{ bucketStartDate: string }> }; loading: boolean }) => (
    <div
      data-testid="settlement-sales-trend-chart"
      data-loading={loading ? "true" : "false"}
      data-points={chartData.points.length}
    />
  )
}));

vi.mock("./modules/useSettlementRecentAdjustmentsQuery", () => ({
  useSettlementRecentAdjustmentsQuery: () => ({
    recentAdjustments: [],
    recentAdjustmentsLoading: false,
    recentAdjustmentsError: null,
    refetchRecentAdjustments: vi.fn()
  })
}));

vi.mock("./modules/useTrainerSettlementWorkspaceState", () => ({
  useTrainerSettlementWorkspaceState: () => ({
    trainerSettlementFilters: mockTrainerSettlementFilters,
    setTrainerSettlementFilters,
    submittedTrainerSettlementQuery: mockTrainerSettlementFilters,
    trainerSettlementPanelMessage: null,
    setTrainerSettlementPanelMessage,
    trainerSettlementPanelError: null,
    setTrainerSettlementPanelError,
    clearTrainerSettlementFeedback,
    submitTrainerSettlementFilters,
    applyTrainerSettlementPreset,
    activeSettlement: mockActiveSettlement,
    syncCreatedSettlement,
    markSettlementConfirmed,
    resetTrainerSettlementWorkspace
  })
}));

vi.mock("./modules/useTrainerSettlementPreviewQuery", () => ({
  useTrainerSettlementPreviewQuery: (_mode: "manager" | "trainer") => ({
    trainerSettlementPreview: mockTrainerSettlementPreview,
    trainerSettlementPreviewLoading: false,
    trainerSettlementPreviewError: null,
    trainerSettlementPreviewMessage: null,
    refetchTrainerSettlementPreview: vi.fn()
  })
}));

vi.mock("../memberships/modules/useTrainerOptionsQuery", () => ({
  useTrainerOptionsQuery: () => ({
    trainerOptions: [
      { userId: 41, centerId: 1, userName: "정트레이너" },
      { userId: 42, centerId: 1, userName: "김트레이너" }
    ],
    trainerOptionsLoading: false,
    trainerOptionsError: null,
    loadTrainerOptions: vi.fn(),
    resetTrainerOptions: vi.fn()
  })
}));

describe("SettlementsPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    navigateMock.mockReset();
    mockSettlementFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "",
      productKeyword: "",
      trendGranularity: "DAILY"
    };
    mockSettlementReport = {
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
          bucketStartDate: "2026-03-01",
          bucketLabel: "03/01",
          grossSales: 50000,
          refundAmount: 5000,
          netSales: 45000,
          transactionCount: 2
        },
        {
          bucketStartDate: "2026-03-02",
          bucketLabel: "03/02",
          grossSales: 50000,
          refundAmount: 15000,
          netSales: 35000,
          transactionCount: 3
        }
      ],
      rows: [
        {
          productName: "3개월 PT",
          paymentMethod: "CARD",
          grossSales: 100000,
          refundAmount: 20000,
          netSales: 80000,
          transactionCount: 5
        }
      ]
    };
    mockTrainerSettlementFilters = {
      trainerId: "ALL",
      settlementMonth: "2026-03"
    };
    mockActiveSettlement = null;
    mockTrainerSettlementPreview = {
      settlementMonth: "2026-03",
      scope: {
        trainerId: "ALL",
        trainerName: "전체 트레이너"
      },
      period: {
        start: "2026-03-01",
        end: "2026-03-31"
      },
      summary: {
        totalSessions: 21,
        completedSessions: 21,
        cancelledSessions: 0,
        noShowSessions: 0,
        totalAmount: 1230000,
        hasRateWarnings: false
      },
      conflict: {
        hasConflict: false,
        createAllowed: true
      },
      rows: [
        {
          trainerUserId: 41,
          trainerName: "정트레이너",
          totalSessions: 12,
          completedSessions: 12,
          cancelledSessions: 0,
          noShowSessions: 0,
          ptSessions: 12,
          gxSessions: 0,
          ptRatePerSession: 50000,
          gxRatePerSession: 30000,
          ptAmount: 600000,
          gxAmount: 0,
          totalAmount: 600000,
          hasRateWarning: false,
          rateWarningMessage: null
        }
      ]
    };
    authStateMock.authUser = {
      userId: 1,
      roleCode: "ROLE_MANAGER",
      primaryRole: "ROLE_MANAGER",
      roles: ["ROLE_MANAGER"]
    };

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

  it("renders manager trainer settlement tab with preview/workspace language", () => {
    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    fireEvent.click(screen.getAllByRole("tab", { name: "트레이너 정산" })[0]);

    expect(screen.getByText("정산 운영 센터")).toBeTruthy();
    expect(screen.getAllByText("트레이너 정산").length).toBeGreaterThan(0);
    expect(screen.getByText("월 기준 preview와 실제 정산 작업을 분리합니다. 먼저 정산 월을 조회하고, 검토가 끝난 뒤에만 DRAFT 생성과 확정을 진행합니다.")).toBeTruthy();
    expect(screen.getByText("월 조회 패널")).toBeTruthy();
    expect(screen.getByText("정산 작업 패널")).toBeTruthy();
    expect(screen.getByRole("button", { name: "preview 조회" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "정산 초안 생성" })).toBeTruthy();
  }, 30000);

  it("renders the sales trend chart section above the retained report tables", () => {
    const view = render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    fireEvent.click(screen.getAllByRole("tab", { name: "매출 분석" })[0]);

    expect(screen.getByTestId("settlement-sales-trend-chart")).toBeTruthy();
    expect(screen.getByTestId("settlement-sales-trend-chart").getAttribute("data-points")).toBe("2");
    expect(screen.getByText("기간 추이 리포트")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Excel 다운로드" })).toBeTruthy();
    expect(screen.getByText("3개월 PT")).toBeTruthy();

    mockSettlementFilters = {
      ...mockSettlementFilters,
      trendGranularity: "MONTHLY"
    };
    mockSettlementReport = {
      ...mockSettlementReport,
      trendGranularity: "MONTHLY",
      trend: [
        {
          bucketStartDate: "2026-03-01",
          bucketLabel: "2026-03",
          grossSales: 120000,
          refundAmount: 20000,
          netSales: 100000,
          transactionCount: 5
        }
      ]
    };

    view.rerender(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    fireEvent.click(screen.getAllByRole("tab", { name: "매출 분석" })[0]);
    expect(screen.getByTestId("settlement-sales-trend-chart").getAttribute("data-points")).toBe("1");
  }, 30000);

  it("renders trainer mini view with period preview summary", () => {
    authStateMock.authUser = {
      userId: 41,
      roleCode: "ROLE_TRAINER",
      primaryRole: "ROLE_TRAINER",
      roles: ["ROLE_TRAINER"]
    };

    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    expect(screen.getByText("내 월 정산 미리보기")).toBeTruthy();
    expect(screen.getByText("내 월 기준 정산 preview")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "이번 달" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "미리보기 조회" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "트레이너 관리로 이동" })).toBeNull();
  });

  it("shows PT/GX rate columns and warning CTA in manager preview", () => {
    mockTrainerSettlementPreview = {
      ...mockTrainerSettlementPreview,
      summary: {
        ...mockTrainerSettlementPreview.summary,
        totalAmount: null,
        hasRateWarnings: true
      },
      conflict: {
        hasConflict: false,
        createAllowed: false
      },
      rows: [
        {
          trainerUserId: 42,
          trainerName: "김트레이너",
          totalSessions: 9,
          completedSessions: 9,
          cancelledSessions: 0,
          noShowSessions: 0,
          ptSessions: 9,
          gxSessions: 0,
          ptRatePerSession: 70000,
          gxRatePerSession: null,
          ptAmount: 630000,
          gxAmount: null,
          totalAmount: null,
          hasRateWarning: true,
          rateWarningMessage: "PT/GX 단가가 미설정입니다. 트레이너 관리에서 설정하세요."
        }
      ]
    };

    const view = render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    const scoped = within(view.container);
    fireEvent.click(scoped.getAllByRole("tab", { name: "트레이너 정산" })[0]);

    expect(scoped.getAllByText("PT 단가").length).toBeGreaterThan(0);
    expect(scoped.getAllByText("GX 단가").length).toBeGreaterThan(0);
    const moveButton = scoped.getByRole("button", { name: "트레이너 관리로 이동" });
    expect(moveButton).toBeTruthy();
    fireEvent.click(moveButton);
    expect(navigateMock).toHaveBeenCalledWith("/trainers");
  }, 30000);
});
