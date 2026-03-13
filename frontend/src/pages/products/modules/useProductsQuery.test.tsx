import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useProductsQuery } from "./useProductsQuery";

describe("useProductsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("includes category and status filters in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useProductsQuery({
        getDefaultFilters: () => ({ category: "", status: "" })
      })
    );

    await act(async () => {
      await result.current.loadProducts({ category: "PT", status: "ACTIVE" });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/products?category=PT&status=ACTIVE",
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
  });

  it("reuses cached results for the same query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            productId: 2,
            centerId: 1,
            productName: "PT 10회권",
            productCategory: "PT",
            productType: "COUNT",
            priceAmount: 550000,
            validityDays: null,
            totalCount: 10,
            allowHold: true,
            maxHoldDays: 30,
            maxHoldCount: 1,
            allowTransfer: false,
            productStatus: "ACTIVE",
            description: null
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useProductsQuery({
        getDefaultFilters: () => ({ category: "", status: "" })
      })
    );

    await act(async () => {
      await result.current.loadProducts({ category: "PT", status: "ACTIVE" });
      await result.current.loadProducts({ category: "PT", status: "ACTIVE" });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
