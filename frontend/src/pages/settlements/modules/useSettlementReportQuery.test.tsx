import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useSettlementReportQuery } from "./useSettlementReportQuery";
import type { SettlementReportFilters } from "./types";

describe("useSettlementReportQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetQueryInvalidationStateForTests();
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

    const { result } = renderHook(() =>
      useSettlementReportQuery({
        getDefaultFilters: () => ({ startDate: "2026-03-01", endDate: "2026-03-31", paymentMethod: "", productKeyword: "" })
      })
    );

    await act(async () => {
      await result.current.loadSettlementReport({
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        paymentMethod: "CARD",
        productKeyword: "PT"
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/settlements/sales-report?startDate=2026-03-01&endDate=2026-03-31&paymentMethod=CARD&productKeyword=PT",
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
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
          paymentMethod: null,
          productKeyword: null,
          totalGrossSales: 100000,
          totalRefundAmount: 0,
          totalNetSales: 100000,
          rows: []
        },
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-settlement-2"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const filters: SettlementReportFilters = {
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "",
      productKeyword: ""
    };
    const { result } = renderHook(() =>
      useSettlementReportQuery({
        getDefaultFilters: () => filters
      })
    );

    await act(async () => {
      await result.current.loadSettlementReport(filters);
      await result.current.loadSettlementReport(filters);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not let stale requests overwrite the latest success message", async () => {
    let resolveFirst: ((value: unknown) => void) | null = null;
    let resolveSecond: ((value: unknown) => void) | null = null;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useSettlementReportQuery({
        getDefaultFilters: () => ({ startDate: "2026-03-01", endDate: "2026-03-31", paymentMethod: "", productKeyword: "" })
      })
    );

    let firstLoad: Promise<void> | null = null;
    let secondLoad: Promise<void> | null = null;
    await act(async () => {
      firstLoad = result.current.loadSettlementReport({
        startDate: "2026-03-01",
        endDate: "2026-03-31",
        paymentMethod: "",
        productKeyword: ""
      });
      secondLoad = result.current.loadSettlementReport({
        startDate: "2026-04-01",
        endDate: "2026-04-30",
        paymentMethod: "",
        productKeyword: ""
      });
    });

    await act(async () => {
      resolveSecond?.({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            startDate: "2026-04-01",
            endDate: "2026-04-30",
            paymentMethod: null,
            productKeyword: null,
            totalGrossSales: 200000,
            totalRefundAmount: 0,
            totalNetSales: 200000,
            rows: []
          },
          message: "new message",
          timestamp: "2026-03-13T00:00:00Z",
          traceId: "trace-settlement-new"
        })
      });
      await secondLoad;
    });

    await act(async () => {
      resolveFirst?.({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            paymentMethod: null,
            productKeyword: null,
            totalGrossSales: 100000,
            totalRefundAmount: 0,
            totalNetSales: 100000,
            rows: []
          },
          message: "old message",
          timestamp: "2026-03-13T00:00:00Z",
          traceId: "trace-settlement-old"
        })
      });
      await firstLoad;
    });

    expect(result.current.settlementReport?.startDate).toBe("2026-04-01");
    expect(result.current.settlementReportMessage).toBe("new message");
  });
});
