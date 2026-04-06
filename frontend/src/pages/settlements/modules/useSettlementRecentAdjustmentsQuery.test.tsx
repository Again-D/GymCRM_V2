import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useSettlementRecentAdjustmentsQuery } from "./useSettlementRecentAdjustmentsQuery";
import type { SettlementReportFilters } from "./types";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSettlementRecentAdjustmentsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("requests recent adjustments with shared settlement filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            paymentId: 1,
            adjustmentType: "REFUND",
            productName: "PT 10회권",
            memberName: "김민수",
            paymentMethod: "CARD",
            amount: 110000,
            paidAt: "2026-03-05T09:00:00Z",
            memo: "부분 환불",
            approvalRef: null
          }
        ],
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const filters: SettlementReportFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "CARD",
      productKeyword: "PT",
      trendGranularity: "DAILY"
    };

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSettlementRecentAdjustmentsQuery(filters, 3), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
    });

    await vi.waitFor(() => {
      expect(result.current.recentAdjustments.length).toBe(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/recent-adjustments\?startDate=2026-03-01&endDate=2026-03-31&limit=3/),
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/paymentMethod=CARD/), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/productKeyword=PT/), expect.anything());
  });

  it("returns an empty list when the API has no refund rows", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const filters: SettlementReportFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "",
      productKeyword: "",
      trendGranularity: "DAILY"
    };

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSettlementRecentAdjustmentsQuery(filters, 5), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
    });

    await vi.waitFor(() => {
      expect(result.current.recentAdjustmentsLoading).toBe(false);
    });

    expect(result.current.recentAdjustments).toEqual([]);
  });
});
