import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData, getMockResponse } from "../../../api/mockData";
import { useProductPrototypeState } from "./useProductPrototypeState";
import type { ProductRecord } from "./types";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useProductPrototypeState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
    resetMockData();
  });

  it("creates a product and invalidates domains", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useProductPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    act(() => {
      result.current.startCreateProduct();
      result.current.setProductForm((prev) => ({
        ...prev,
        productName: "필라테스 8회권",
        productCategory: "GX",
        productType: "COUNT",
        priceAmount: "240000",
        totalCount: "8",
        validityDays: ""
      }));
    });

    await act(async () => {
      await result.current.handleProductSubmit();
    });

    const products = getMockResponse("/api/v1/products")?.data as ProductRecord[];
    expect(products.some((product) => product.productName === "필라테스 8회권")).toBe(true);
    expect(result.current.productPanelMessage).toContain("생성");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("toggles product status and invalidates domains", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useProductPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const products = getMockResponse("/api/v1/products")?.data as ProductRecord[];
    const target = products[0];

    act(() => {
      result.current.openProductEditor(target);
    });

    await act(async () => {
      await result.current.handleProductStatusToggle();
    });

    const refreshedProducts = getMockResponse("/api/v1/products")?.data as ProductRecord[];
    expect(refreshedProducts.find((product) => product.productId === target.productId)?.productStatus).toBe("INACTIVE");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("creates products through live API mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          productId: 9101,
          centerId: 1,
          productName: "라이브 상품",
          productCategory: "PT",
          productType: "COUNT",
          priceAmount: 330000,
          validityDays: null,
          totalCount: 10,
          allowHold: true,
          maxHoldDays: 30,
          maxHoldCount: 1,
          allowTransfer: false,
          productStatus: "ACTIVE",
          description: null
        },
        message: "상품이 등록되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-product-create"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useProductPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    act(() => {
      result.current.startCreateProduct();
      result.current.setProductForm((prev) => ({
        ...prev,
        productName: "라이브 상품",
        productCategory: "PT",
        productType: "COUNT",
        priceAmount: "330000",
        totalCount: "10",
        validityDays: ""
      }));
    });

    await act(async () => {
      await result.current.handleProductSubmit();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/products",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.productPanelMessage).toBe("상품이 등록되었습니다.");
    expect(result.current.selectedProductId).toBe(9101);
  });
});
