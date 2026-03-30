import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useProductsQuery } from "./useProductsQuery";
import type { ProductFilters } from "./types";

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

    const queryClient = createTestQueryClient();
    const filters: ProductFilters = { category: "PT" as any, status: "ACTIVE" as any };
    const { result } = renderHook(() => useProductsQuery(filters), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/products?category=PT&status=ACTIVE",
        expect.objectContaining({
          credentials: "include",
          method: "GET"
        })
      );
    });
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

    const queryClient = createTestQueryClient();
    const filters: ProductFilters = { category: "PT" as any, status: "ACTIVE" as any };

    const { rerender, result } = renderHook(({ f }) => useProductsQuery(f), {
      initialProps: { f: filters },
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.products).toHaveLength(1);
    });

    rerender({ f: { ...filters } });

    await vi.waitFor(() => {
      expect(result.current.products).toHaveLength(1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps public query actions stable across rerenders", () => {
    const queryClient = createTestQueryClient();
    const filters: ProductFilters = { category: "", status: "" };
    const { result, rerender } = renderHook(({ f }) => useProductsQuery(f), {
      initialProps: { f: filters },
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const firstRefetch = result.current.refetchProducts;

    rerender({ f: { category: "PT" as any, status: "ACTIVE" as any } });

    expect(result.current.refetchProducts).toBe(firstRefetch);
  });
});
