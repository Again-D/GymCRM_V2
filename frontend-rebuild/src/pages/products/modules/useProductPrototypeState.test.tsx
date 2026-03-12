import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { getMockResponse, resetMockData } from "../../../api/mockData";
import { useProductPrototypeState } from "./useProductPrototypeState";
import type { ProductRecord } from "./types";

describe("useProductPrototypeState", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("creates a product and exposes it through the shared products source", async () => {
    const { result } = renderHook(() => useProductPrototypeState());

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
  });

  it("toggles product status for the selected product", async () => {
    const { result } = renderHook(() => useProductPrototypeState());
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
  });
});
