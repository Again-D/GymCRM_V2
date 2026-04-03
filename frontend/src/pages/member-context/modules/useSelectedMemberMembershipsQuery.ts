import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type {
  MembershipPaymentRecord,
  PurchasedMembership,
} from "../../members/modules/types";

// ... omitted types for brevity, keep your original type definitions above this line if I can't overwrite them fully, wait I'll rewrite the whole start of file if it spans from 1 to 168. Actually yes, I need to include the types.
type CreateMembershipInput = {
  memberId: number;
  productId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  assignedTrainerId: number | null;
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
  paymentMethod: MembershipPaymentRecord["paymentMethod"];
  paidAmount: number | null;
  membershipMemo: string | null;
  paymentMemo: string | null;
};

type PurchaseMembershipResponse = {
  membership: PurchasedMembership;
  payment: MembershipPaymentRecord;
  calculation: {
    startDate: string;
    endDate: string | null;
    totalCount: number | null;
    remainingCount: number | null;
    chargeAmount: number;
  };
};

type HoldMembershipResponse = {
  membership: PurchasedMembership;
  hold: {
    membershipHoldId: number;
    centerId: number;
    membershipId: number;
    holdStatus: "ACTIVE" | "RESUMED" | "CANCELED";
    holdStartDate: string;
    holdEndDate: string;
    resumedAt: string | null;
    actualHoldDays: number | null;
    reason: string | null;
    memo: string | null;
  };
  preview: {
    plannedHoldDays: number;
    recalculatedEndDate: string | null;
  };
};

type ResumeMembershipResponse = {
  membership: PurchasedMembership;
  hold: {
    membershipHoldId: number;
    centerId: number;
    membershipId: number;
    holdStatus: "ACTIVE" | "RESUMED" | "CANCELED";
    holdStartDate: string;
    holdEndDate: string;
    resumedAt: string | null;
    actualHoldDays: number | null;
    reason: string | null;
    memo: string | null;
  };
  calculation: {
    actualHoldDays: number;
    recalculatedEndDate: string | null;
  };
};

type RefundPreviewCalculation = {
  refundDate: string;
  originalAmount: number;
  usedAmount: number;
  penaltyAmount: number;
  refundAmount: number;
};

type RefundPreviewResponse = {
  calculation: RefundPreviewCalculation;
};

type RefundMembershipResponse = {
  membership: PurchasedMembership;
  payment: MembershipPaymentRecord;
  refund: {
    membershipRefundId: number;
    centerId: number;
    membershipId: number;
    refundPaymentId: number | null;
    refundStatus: "COMPLETED" | "CANCELED";
    refundReason: string | null;
    originalAmount: number;
    usedAmount: number;
    penaltyAmount: number;
    refundAmount: number;
    memo: string | null;
  };
  calculation: RefundPreviewCalculation;
};

export function useSelectedMemberMembershipsQuery(hookMemberId?: number | null) {
  const [overrideMemberId, setOverrideMemberId] = useState<number | null>(null);
  const activeMemberId = hookMemberId ?? overrideMemberId ?? null;
  const queryClient = useQueryClient();

  const membershipIdSeedRef = useRef(99000);
  const useMockMutations = isMockApiMode();

  const queryKey = queryKeys.memberships.list({ memberId: activeMemberId });

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await apiGet<PurchasedMembership[]>(
        `/api/v1/members/${activeMemberId}/memberships`
      );
      return response.data;
    },
    enabled: activeMemberId != null,
    staleTime: queryPolicies.list.staleTime,
  });

  const loadSelectedMemberMemberships = useCallback(
    async (memberId: number) => {
      setOverrideMemberId(memberId);
    },
    []
  );

  const resetSelectedMemberMembershipsQuery = useCallback(() => {
    setOverrideMemberId(null);
  }, []);

  const invalidateRelated = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.trainers.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all });
    if (activeMemberId != null) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.memberships.list({ memberId: activeMemberId }) });
    }
  }, [queryClient, activeMemberId]);

  const appendMembership = useCallback(
    (membership: PurchasedMembership) => {
      queryClient.setQueryData<PurchasedMembership[]>(queryKey, (prev) =>
        prev ? [membership, ...prev] : [membership]
      );
    },
    [queryClient, queryKey]
  );

  const replaceMembership = useCallback(
    (nextMembership: PurchasedMembership) => {
      queryClient.setQueryData<PurchasedMembership[]>(queryKey, (prev) =>
        prev
          ? prev.map((m) =>
              m.membershipId === nextMembership.membershipId ? nextMembership : m
            )
          : []
      );
    },
    [queryClient, queryKey]
  );

  const createMembership = useCallback(
    async (input: CreateMembershipInput) => {
      if (!useMockMutations) {
        const response = await apiPost<PurchaseMembershipResponse>(
          `/api/v1/members/${input.memberId}/memberships`,
          {
            productId: input.productId,
            assignedTrainerId: input.assignedTrainerId,
            startDate: input.startDate || null,
            paidAmount: input.paidAmount,
            paymentMethod: input.paymentMethod,
            membershipMemo: input.membershipMemo,
            paymentMemo: input.paymentMemo,
          },
        );
        appendMembership(response.data.membership);
        invalidateRelated();
        return response.data;
      }

      const { createMockMembership } = await import("../../../api/mockData");
      const membership = createMockMembership(input);
      membershipIdSeedRef.current = Math.max(
        membershipIdSeedRef.current + 1,
        membership.membershipId,
      );
      appendMembership(membership);
      invalidateRelated();

      const payment: MembershipPaymentRecord = {
        paymentId: membership.membershipId + 100000,
        membershipId: membership.membershipId,
        paymentType: "PURCHASE",
        paymentStatus: "PAID",
        paymentMethod: input.paymentMethod,
        amount: input.paidAmount ?? 0,
        paidAt: new Date().toISOString(),
        memo: input.paymentMemo,
      };

      return {
        membership,
        payment,
        calculation: {
          startDate: membership.startDate,
          endDate: membership.endDate,
          totalCount: null,
          remainingCount: membership.remainingCount,
          chargeAmount: input.paidAmount ?? 0,
        },
      };
    },
    [useMockMutations, appendMembership, invalidateRelated],
  );

  const holdMembership = useCallback(
    async (
      membership: PurchasedMembership,
      input: {
        holdStartDate: string;
        holdEndDate: string;
        reason?: string | null;
        memo?: string | null;
        overrideLimits?: boolean;
      },
    ) => {
      if (!useMockMutations) {
        const response = await apiPost<HoldMembershipResponse>(
          `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/hold`,
          {
            holdStartDate: input.holdStartDate || null,
            holdEndDate: input.holdEndDate || null,
            reason: input.reason ?? null,
            memo: input.memo ?? null,
            overrideLimits: input.overrideLimits ?? false,
          },
        );
        replaceMembership(response.data.membership);
        invalidateRelated();
        return response.data;
      }

      const { patchMockMembership } = await import("../../../api/mockData");
      const nextMembership =
        patchMockMembership(
          membership.memberId,
          membership.membershipId,
          (current) => ({
            ...current,
            membershipStatus: "HOLDING",
            activeHoldStatus: "ACTIVE",
          }),
        ) ?? membership;
      replaceMembership(nextMembership);
      invalidateRelated();

      return {
        membership: nextMembership,
        hold: {
          membershipHoldId: membership.membershipId + 40000,
          centerId: 1,
          membershipId: membership.membershipId,
          holdStatus: "ACTIVE",
          holdStartDate: input.holdStartDate,
          holdEndDate: input.holdEndDate,
          resumedAt: null,
          actualHoldDays: null,
          reason: input.reason ?? null,
          memo: input.memo ?? null,
        },
        preview: {
          plannedHoldDays: 1,
          recalculatedEndDate: nextMembership.endDate,
        },
      };
    },
    [useMockMutations, replaceMembership, invalidateRelated],
  );

  const resumeMembership = useCallback(
    async (membership: PurchasedMembership, input: { resumeDate: string }) => {
      if (!useMockMutations) {
        const response = await apiPost<ResumeMembershipResponse>(
          `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/resume`,
          {
            resumeDate: input.resumeDate || null,
          },
        );
        replaceMembership(response.data.membership);
        invalidateRelated();
        return response.data;
      }

      const { patchMockMembership } = await import("../../../api/mockData");
      const nextMembership =
        patchMockMembership(
          membership.memberId,
          membership.membershipId,
          (current) => ({
            ...current,
            membershipStatus: "ACTIVE",
            activeHoldStatus: null,
          }),
        ) ?? membership;
      replaceMembership(nextMembership);
      invalidateRelated();

      return {
        membership: nextMembership,
        hold: {
          membershipHoldId: membership.membershipId + 40000,
          centerId: 1,
          membershipId: membership.membershipId,
          holdStatus: "RESUMED",
          holdStartDate: input.resumeDate,
          holdEndDate: input.resumeDate,
          resumedAt: new Date().toISOString(),
          actualHoldDays: 1,
          reason: null,
          memo: null,
        },
        calculation: {
          actualHoldDays: 1,
          recalculatedEndDate: nextMembership.endDate,
        },
      };
    },
    [useMockMutations, replaceMembership, invalidateRelated],
  );

  const previewMembershipRefund = useCallback(
    async (membership: PurchasedMembership, input: { refundDate: string }) => {
      if (!useMockMutations) {
        const response = await apiPost<RefundPreviewResponse>(
          `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/refund/preview`,
          {
            refundDate: input.refundDate || null,
          },
        );
        return response.data;
      }

      return {
        calculation: {
          refundDate: input.refundDate,
          originalAmount:
            membership.productTypeSnapshot === "COUNT" ? 550000 : 180000,
          usedAmount: membership.productTypeSnapshot === "COUNT" ? 0 : 63000,
          penaltyAmount:
            membership.productTypeSnapshot === "COUNT" ? 55000 : 18000,
          refundAmount:
            membership.productTypeSnapshot === "COUNT" ? 495000 : 99000,
        },
      };
    },
    [useMockMutations],
  );

  const refundMembership = useCallback(
    async (
      membership: PurchasedMembership,
      input: {
        refundDate: string;
        refundPaymentMethod: MembershipPaymentRecord["paymentMethod"];
        refundReason?: string | null;
        refundMemo?: string | null;
        paymentMemo?: string | null;
      },
    ) => {
      if (!useMockMutations) {
        const response = await apiPost<RefundMembershipResponse>(
          `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/refund`,
          {
            refundDate: input.refundDate || null,
            refundPaymentMethod: input.refundPaymentMethod,
            refundReason: input.refundReason ?? null,
            refundMemo: input.refundMemo ?? null,
            paymentMemo: input.paymentMemo ?? null,
          },
        );
        replaceMembership(response.data.membership);
        invalidateRelated();
        return response.data;
      }

      const calculation = await previewMembershipRefund(membership, {
        refundDate: input.refundDate,
      });
      const { patchMockMembership } = await import("../../../api/mockData");
      const nextMembership =
        patchMockMembership(
          membership.memberId,
          membership.membershipId,
          (current) => ({
            ...current,
            membershipStatus: "REFUNDED",
            activeHoldStatus: null,
          }),
        ) ?? membership;
      replaceMembership(nextMembership);
      invalidateRelated();

      const payment: MembershipPaymentRecord = {
        paymentId: membership.membershipId + 200000,
        membershipId: membership.membershipId,
        paymentType: "REFUND",
        paymentStatus: "REFUNDED",
        paymentMethod: input.refundPaymentMethod,
        amount: -calculation.calculation.refundAmount,
        paidAt: new Date().toISOString(),
        memo: input.paymentMemo ?? null,
      };

      return {
        membership: nextMembership,
        payment,
        refund: {
          membershipRefundId: membership.membershipId + 300000,
          centerId: 1,
          membershipId: membership.membershipId,
          refundPaymentId: membership.membershipId + 200000,
          refundStatus: "COMPLETED",
          refundReason: input.refundReason ?? null,
          originalAmount: calculation.calculation.originalAmount,
          usedAmount: calculation.calculation.usedAmount,
          penaltyAmount: calculation.calculation.penaltyAmount,
          refundAmount: calculation.calculation.refundAmount,
          memo: input.refundMemo ?? null,
        },
        calculation: calculation.calculation,
      };
    },
    [previewMembershipRefund, useMockMutations, replaceMembership, invalidateRelated],
  );

  return {
    selectedMemberMemberships: query.data ?? [],
    selectedMemberMembershipsLoading: query.isFetching || query.isPending,
    selectedMemberMembershipsError: query.error ? toUserFacingErrorMessage(query.error, "회원권 목록을 불러오지 못했습니다.") : null,
    loadSelectedMemberMemberships,
    resetSelectedMemberMembershipsQuery,
    createMembership,
    holdMembership,
    resumeMembership,
    previewMembershipRefund,
    refundMembership,
  } as const;
}
