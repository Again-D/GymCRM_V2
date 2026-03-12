import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useMembershipPrototypeState } from "./useMembershipPrototypeState";
import type { ProductRecord } from "../../products/modules/types";

const availableProducts: ProductRecord[] = [
  {
    productId: 1,
    centerId: 1,
    productName: "헬스 90일권",
    productCategory: "MEMBERSHIP",
    productType: "DURATION",
    priceAmount: 180000,
    validityDays: 90,
    totalCount: null,
    allowHold: true,
    maxHoldDays: 30,
    maxHoldCount: 1,
    allowTransfer: false,
    productStatus: "ACTIVE",
    description: null
  },
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
];

describe("useMembershipPrototypeState", () => {
  it("creates a membership and purchase payment from the preview", () => {
    const createLocalMembership = vi.fn().mockImplementation((input) => ({
      membershipId: 99001,
      memberId: input.memberId,
      productNameSnapshot: input.productNameSnapshot,
      productTypeSnapshot: input.productTypeSnapshot,
      membershipStatus: "ACTIVE",
      startDate: input.startDate,
      endDate: input.endDate,
      remainingCount: input.remainingCount,
      activeHoldStatus: null
    }));
    const patchLocalMembership = vi.fn();

    const { result } = renderHook(() =>
      useMembershipPrototypeState({
        selectedMemberId: 101,
        availableProducts,
        createLocalMembership,
        patchLocalMembership
      })
    );

    act(() => {
      result.current.setPurchaseForm((prev) => ({
        ...prev,
        productId: "2",
        paidAmount: "510000",
        paymentMemo: "테스트 결제"
      }));
    });

    act(() => {
      result.current.handlePurchaseSubmit();
    });

    expect(createLocalMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        memberId: 101,
        productNameSnapshot: "PT 10회권",
        productTypeSnapshot: "COUNT",
        remainingCount: 10
      })
    );
    expect(result.current.payments[0]).toMatchObject({
      membershipId: 99001,
      paymentType: "PURCHASE",
      paymentStatus: "PAID",
      amount: 510000
    });
  });

  it("patches membership hold, resume, and refund transitions", () => {
    const createLocalMembership = vi.fn();
    const patchLocalMembership = vi.fn();
    const membership = {
      membershipId: 9002,
      memberId: 101,
      productNameSnapshot: "헬스 90일권",
      productTypeSnapshot: "DURATION" as const,
      membershipStatus: "ACTIVE" as const,
      startDate: "2026-03-01",
      endDate: "2026-05-29",
      remainingCount: null,
      activeHoldStatus: null
    };

    const { result } = renderHook(() =>
      useMembershipPrototypeState({
        selectedMemberId: 101,
        availableProducts,
        createLocalMembership,
        patchLocalMembership
      })
    );

    act(() => {
      result.current.handleHoldSubmit(membership);
      result.current.handleResumeSubmit({ ...membership, membershipStatus: "HOLDING", activeHoldStatus: "ACTIVE" });
      result.current.handleRefundSubmit(membership);
    });

    expect(patchLocalMembership).toHaveBeenCalledTimes(3);
    expect(result.current.payments[result.current.payments.length - 1]).toMatchObject({
      membershipId: 9002,
      paymentType: "REFUND",
      paymentStatus: "REFUNDED"
    });
  });
});
