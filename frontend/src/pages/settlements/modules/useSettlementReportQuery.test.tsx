import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useSettlementReportQuery } from "./useSettlementReportQuery";
import type { SettlementReportFilters } from "./types";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSettlementReportQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("includes settlement filters in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          startDate: "2026-03-01",
          endDate: "2026-03-31",
          paymentMethod: "CARD",
          productKeyword: "PT",
          totalGrossSales: 100000,
          totalRefundAmount: 0,
          totalNetSales: 100000,
          rows: []
        },
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-settlement-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const filters: SettlementReportFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "CARD",
      productKeyword: "PT"
    };

    const { result } = renderHook(() => useSettlementReportQuery(filters), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.settlementReport).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/settlements\/sales-report\?.*startDate=2026-03-01&endDate=2026-03-31/),
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/paymentMethod=CARD/),
      expect.anything()
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/productKeyword=PT/),
      expect.anything()
    );
  });

  it("reuses cached results for the same filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          startDate: "2026-03-01",
          endDate: "2026-03-31",
          totalGrossSales: 100000,
          rows: []
        },
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const filters: SettlementReportFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "",
      productKeyword: ""
    };

    const { rerender, result } = renderHook(({ f }) => useSettlementReportQuery(f), {
      initialProps: { f: filters },
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.settlementReport).not.toBeNull();
    });

    rerender({ f: { ...filters } });

    await vi.waitFor(() => {
      expect(result.current.settlementReport).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps settlement query actions stable across rerenders", () => {
    const queryClient = createTestQueryClient();
    const filters: SettlementReportFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "",
      productKeyword: ""
    };

    const { result, rerender } = renderHook(({ f }) => useSettlementReportQuery(f), {
      initialProps: { f: filters },
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const firstRefetch = result.current.refetchSettlementReport;

    rerender({
      f: {
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        paymentMethod: "CARD",
        productKeyword: "PT"
      }
    });

    expect(result.current.refetchSettlementReport).toBe(firstRefetch);
  });
});
