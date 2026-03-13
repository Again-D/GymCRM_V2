import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMembershipMutations } from "./useMembershipMutations";

const { apiPostMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiPost: apiPostMock
}));

describe("useMembershipMutations", () => {
  beforeEach(() => {
    apiPostMock.mockReset();
  });

  it("handles purchase in the memberships slice and invalidates shared domains", async () => {
    const invalidateQueries = vi.fn();
    const refreshSelectedMember = vi.fn().mockResolvedValue(undefined);

    apiPostMock.mockResolvedValue({
      message: "구매 완료",
      data: {
        membership: {
          membershipId: 101,
          centerId: 1,
          memberId: 7,
          productId: 3,
          assignedTrainerId: null,
          membershipStatus: "ACTIVE",
          productNameSnapshot: "PT 10회",
          productCategorySnapshot: "PT",
          productTypeSnapshot: "COUNT",
          priceAmountSnapshot: 200000,
          purchasedAt: "2026-03-13T10:00:00Z",
          startDate: "2026-03-13",
          endDate: null,
          totalCount: 10,
          remainingCount: 10,
          usedCount: 0,
          holdDaysUsed: 0,
          holdCountUsed: 0,
          memo: null,
          activeHoldStatus: null,
          activeHoldStartDate: null,
          activeHoldEndDate: null
        },
        payment: {
          paymentId: 501,
          membershipId: 101,
          paymentType: "PURCHASE",
          paymentStatus: "COMPLETED",
          paymentMethod: "CARD",
          amount: 200000,
          paidAt: "2026-03-13T10:00:00Z",
          memo: null
        },
        calculation: {
          startDate: "2026-03-13",
          endDate: null,
          totalCount: 10,
          remainingCount: 10,
          chargeAmount: 200000
        }
      }
    });

    const { result } = renderHook(() => {
      const [membershipsByMemberId, setMembershipsByMemberId] = useState<Record<number, any[]>>({});
      const [paymentsByMemberId, setPaymentsByMemberId] = useState<Record<number, any[]>>({});
      const [purchaseProductDetail, setPurchaseProductDetail] = useState<unknown>(null);
      const hook = useMembershipMutations({
        selectedMember: { memberId: 7 },
        setPurchaseProductDetail: setPurchaseProductDetail as (value: null) => void,
        setMemberMembershipsByMemberId: setMembershipsByMemberId,
        setMemberPaymentsByMemberId: setPaymentsByMemberId,
        invalidateQueries,
        refreshSelectedMember,
        parseRequiredNumber: (value: string) => Number.parseFloat(value),
        normalizeOptionalText: (value: string) => value.trim() || null,
        formatError: () => "load failed"
      });

      return {
        hook,
        membershipsByMemberId,
        paymentsByMemberId,
        setPurchaseProductDetail
      };
    });

    act(() => {
      result.current.hook.setPurchaseForm((prev) => ({
        ...prev,
        productId: "3",
        paidAmount: "200000",
        paymentMethod: "CARD"
      }));
      result.current.setPurchaseProductDetail({ productId: 3 });
    });

    await act(async () => {
      await result.current.hook.handleMembershipPurchaseSubmit(
        { preventDefault() {} } as React.FormEvent<HTMLFormElement>,
        {
          purchaseProductDetail: { productId: 3 },
          purchasePreview: null
        }
      );
    });

    await waitFor(() => {
      expect(result.current.membershipsByMemberId[7]).toHaveLength(1);
    });

    expect(result.current.paymentsByMemberId[7]).toHaveLength(1);
    expect(invalidateQueries).toHaveBeenCalledWith("members", "reservationTargets", "workspaceMemberSearch");
    expect(refreshSelectedMember).toHaveBeenCalledWith(7);
    expect(result.current.hook.memberPurchaseMessage).toBe("구매 완료");
    expect(result.current.hook.purchaseForm.productId).toBe("");
  });
});
