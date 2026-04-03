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
  it("creates a membership and purchase payment from the preview", async () => {
    const createMembership = vi.fn().mockResolvedValue({
      membership: {
        membershipId: 99001,
        memberId: 101,
        productNameSnapshot: "PT 10회권",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-03-13",
        endDate: null,
        remainingCount: 10,
        activeHoldStatus: null
      },
      payment: {
        paymentId: 88001,
        membershipId: 99001,
        paymentType: "PURCHASE",
        paymentStatus: "PAID",
        paymentMethod: "CASH",
        amount: 510000,
        paidAt: "2026-03-13T10:00:00Z",
        memo: "테스트 결제"
      }
    });
    const holdMembership = vi.fn();
    const resumeMembership = vi.fn();
    const previewMembershipRefund = vi.fn();
    const refundMembership = vi.fn();

    const { result } = renderHook(() =>
      useMembershipPrototypeState({
        selectedMemberId: 101,
        availableProducts,
        createMembership,
        holdMembership,
        resumeMembership,
        previewMembershipRefund,
        refundMembership
      })
    );

    act(() => {
      result.current.setPurchaseForm((prev) => ({
        ...prev,
        productId: "2",
        assignedTrainerId: "41",
        paidAmount: "510000",
        paymentMemo: "테스트 결제"
      }));
    });

    await act(async () => {
      await result.current.handlePurchaseSubmit();
    });

    expect(createMembership).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 2,
        memberId: 101,
        productNameSnapshot: "PT 10회권",
        productTypeSnapshot: "COUNT",
        assignedTrainerId: 41,
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

  it("blocks PT purchase submission when assigned trainer is missing", async () => {
    const createMembership = vi.fn();
    const { result } = renderHook(() =>
      useMembershipPrototypeState({
        selectedMemberId: 101,
        availableProducts,
        createMembership,
        holdMembership: vi.fn(),
        resumeMembership: vi.fn(),
        previewMembershipRefund: vi.fn(),
        refundMembership: vi.fn()
      })
    );

    act(() => {
      result.current.setPurchaseForm((prev) => ({
        ...prev,
        productId: "2"
      }));
    });

    await act(async () => {
      await result.current.handlePurchaseSubmit();
    });

    expect(createMembership).not.toHaveBeenCalled();
    expect(result.current.membershipPanelError).toBe("PT 상품은 담당 트레이너를 선택해야 합니다.");
  });

  it("runs hold, resume, and refund mutations through the async action layer", async () => {
    const createMembership = vi.fn();
    const holdMembership = vi.fn().mockResolvedValue({ membership: { membershipId: 9002 } });
    const resumeMembership = vi.fn().mockResolvedValue({ membership: { membershipId: 9002 } });
    const previewMembershipRefund = vi.fn().mockResolvedValue({
      calculation: {
        refundDate: "2026-03-13",
        originalAmount: 180000,
        usedAmount: 63000,
        penaltyAmount: 18000,
        refundAmount: 99000
      }
    });
    const refundMembership = vi.fn().mockResolvedValue({
      membership: { membershipId: 9002 },
      payment: {
        paymentId: 88002,
        membershipId: 9002,
        paymentType: "REFUND",
        paymentStatus: "REFUNDED",
        paymentMethod: "CASH",
        amount: -99000,
        paidAt: "2026-03-13T11:00:00Z",
        memo: null
      },
      calculation: {
        refundDate: "2026-03-13",
        originalAmount: 180000,
        usedAmount: 63000,
        penaltyAmount: 18000,
        refundAmount: 99000
      }
    });
    const membership = {
      membershipId: 9002,
      memberId: 101,
      productNameSnapshot: "헬스 90일권",
      productTypeSnapshot: "DURATION" as const,
      membershipStatus: "ACTIVE" as const,
      startDate: "2026-03-01",
      endDate: "2026-05-29",
      remainingCount: null,
      productId: 1,
      activeHoldStatus: null
    };

    const { result } = renderHook(() =>
      useMembershipPrototypeState({
        selectedMemberId: 101,
        availableProducts,
        createMembership,
        holdMembership,
        resumeMembership,
        previewMembershipRefund,
        refundMembership
      })
    );

    await act(async () => {
      await result.current.handleHoldSubmit(membership);
      await result.current.handleResumeSubmit({
        ...membership,
        membershipStatus: "HOLDING",
        activeHoldStatus: "ACTIVE"
      });
      await result.current.handleRefundSubmit(membership);
    });

    expect(holdMembership).toHaveBeenCalledTimes(1);
    expect(resumeMembership).toHaveBeenCalledTimes(1);
    expect(previewMembershipRefund).toHaveBeenCalledTimes(1);
    expect(refundMembership).toHaveBeenCalledTimes(1);
    expect(result.current.payments[result.current.payments.length - 1]).toMatchObject({
      membershipId: 9002,
      paymentType: "REFUND",
      paymentStatus: "REFUNDED"
    });
  });
});
