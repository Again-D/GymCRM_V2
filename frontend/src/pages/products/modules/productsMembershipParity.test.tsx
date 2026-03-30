import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMockResponse, resetMockData } from "../../../api/mockData";
import { resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useMembershipPrototypeState } from "../../memberships/modules/useMembershipPrototypeState";
import { useProductPrototypeState } from "./useProductPrototypeState";
import { useProductsQuery } from "./useProductsQuery";

describe("products to memberships parity", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    resetMockData();
    resetQueryInvalidationStateForTests();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (path: string) => ({
        ok: true,
        json: async () => getMockResponse(path),
      })),
    );
  });

  it("lets memberships re-read newly created active products through the shared product domain", async () => {
    const createMembership = vi.fn();
    const holdMembership = vi.fn();
    const resumeMembership = vi.fn();
    const previewMembershipRefund = vi.fn();
    const refundMembership = vi.fn();

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, rerender } = renderHook(
      () => {
        const productsQuery = useProductsQuery({ category: "", status: "ACTIVE" });
        const productState = useProductPrototypeState();
        const membershipState = useMembershipPrototypeState({
          selectedMemberId: 101,
          availableProducts: productsQuery.products,
          createMembership,
          holdMembership,
          resumeMembership,
          previewMembershipRefund,
          refundMembership,
        });

        return {
          productsQuery,
          productState,
          membershipState,
        };
      },
      { wrapper },
    );

    await act(async () => {
      await result.current.productsQuery.refetchProducts();
    });

    act(() => {
      result.current.productState.startCreateProduct();
      result.current.productState.setProductForm((prev) => ({
        ...prev,
        productName: "재구축 PT 20회권",
        productCategory: "PT",
        productType: "COUNT",
        priceAmount: "700000",
        validityDays: "",
        totalCount: "20",
      }));
    });

    await act(async () => {
      await result.current.productState.handleProductSubmit();
    });

    rerender();

    await act(async () => {
      await result.current.productsQuery.refetchProducts();
    });

    const nextProduct = result.current.productsQuery.products.find(
      (product) => product.productName === "재구축 PT 20회권",
    );
    expect(nextProduct).toBeTruthy();

    act(() => {
      result.current.membershipState.setPurchaseForm((prev) => ({
        ...prev,
        productId: String(nextProduct?.productId ?? ""),
      }));
    });

    expect(result.current.membershipState.purchasePreview?.product.productName).toBe(
      "재구축 PT 20회권",
    );
    expect(result.current.membershipState.purchasePreview?.remainingCount).toBe(20);
  });
});
