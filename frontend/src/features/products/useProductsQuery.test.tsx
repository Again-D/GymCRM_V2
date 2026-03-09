import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProductsQuery } from "./useProductsQuery";

type ProductResponse = {
  data: Array<{
    productId: number;
    centerId: number;
    productName: string;
    productCategory: "COUNT";
    sessionCount: number;
    durationDays: null;
    price: number;
    productStatus: "ACTIVE";
  }>;
};

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock
}));

describe("useProductsQuery", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("loads products from the shared query source", async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          productId: 5,
          centerId: 1,
          productName: "PT 10회",
          productCategory: "COUNT",
          sessionCount: 10,
          durationDays: null,
          price: 200000,
          productStatus: "ACTIVE"
        }
      ]
    });

    const { result } = renderHook(() =>
      useProductsQuery({
        getDefaultFilters: () => ({ category: "", status: "ACTIVE" }),
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      await result.current.loadProducts();
    });

    await waitFor(() => {
      expect(result.current.products).toHaveLength(1);
    });

    expect(apiGetMock).toHaveBeenCalledWith("/api/v1/products?status=ACTIVE");
  });

  it("ignores late product responses after reset", async () => {
    let resolveRequest: ((value: ProductResponse) => void) | null = null;
    apiGetMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { result } = renderHook(() =>
      useProductsQuery({
        getDefaultFilters: () => ({ category: "", status: "" }),
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      void result.current.loadProducts();
    });

    act(() => {
      result.current.resetProductsQuery();
    });

    await act(async () => {
      resolveRequest?.({
        data: [
          {
            productId: 9,
            centerId: 1,
            productName: "Late Product",
            productCategory: "COUNT",
            sessionCount: 1,
            durationDays: null,
            price: 10000,
            productStatus: "ACTIVE"
          }
        ]
      });
      await Promise.resolve();
    });

    expect(result.current.products).toEqual([]);
    expect(result.current.productsLoading).toBe(false);
    expect(result.current.productsQueryError).toBeNull();
  });
});
