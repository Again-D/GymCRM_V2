import { apiPost } from "../../shared/api/client";
import {
  createDefaultMembershipActionDraft,
  createEmptyPurchaseForm,
  type MembershipActionDraft,
  type PurchaseFormState,
  type RefundCalculationApi,
  useMembershipWorkspaceState
} from "./useMembershipWorkspaceState";

export type PurchasedMembership = {
  membershipId: number;
  centerId: number;
  memberId: number;
  productId: number;
  assignedTrainerId: number | null;
  membershipStatus: "ACTIVE" | "HOLDING" | "REFUNDED" | "EXPIRED";
  productNameSnapshot: string;
  productCategorySnapshot: "MEMBERSHIP" | "PT" | "GX" | "ETC";
  productTypeSnapshot: "DURATION" | "COUNT";
  priceAmountSnapshot: number;
  purchasedAt: string;
  startDate: string;
  endDate: string | null;
  totalCount: number | null;
  remainingCount: number | null;
  usedCount: number;
  holdDaysUsed: number;
  holdCountUsed: number;
  memo: string | null;
  activeHoldStatus: "ACTIVE" | "RESUMED" | "CANCELED" | null;
  activeHoldStartDate: string | null;
  activeHoldEndDate: string | null;
};

export type PurchasePayment = {
  paymentId: number;
  membershipId: number;
  paymentType: "PURCHASE" | "REFUND";
  paymentStatus: "COMPLETED" | "CANCELED" | "FAILED";
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "ETC";
  amount: number;
  paidAt: string;
  memo: string | null;
};

type PurchaseCalculation = {
  startDate: string;
  endDate: string | null;
  totalCount: number | null;
  remainingCount: number | null;
  chargeAmount: number;
};

type PurchaseMembershipResponse = {
  membership: PurchasedMembership;
  payment: PurchasePayment;
  calculation: PurchaseCalculation;
};

type MembershipHoldRecord = {
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

type HoldPreviewApi = {
  plannedHoldDays: number;
  recalculatedEndDate: string | null;
};

type ResumeCalculationApi = {
  actualHoldDays: number;
  recalculatedEndDate: string | null;
};

type HoldMembershipResponse = {
  membership: PurchasedMembership;
  hold: MembershipHoldRecord;
  preview: HoldPreviewApi;
};

type ResumeMembershipResponse = {
  membership: PurchasedMembership;
  hold: MembershipHoldRecord;
  calculation: ResumeCalculationApi;
};

type RefundPreviewResponse = {
  calculation: RefundCalculationApi;
};

type MembershipRefundRecord = {
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

type RefundMembershipResponse = {
  membership: PurchasedMembership;
  payment: PurchasePayment;
  refund: MembershipRefundRecord;
  calculation: RefundCalculationApi;
};

type SelectedMemberLike = {
  memberId: number;
} | null;

type PurchasePreviewLike = {
  error?: string;
} | null;

type UseMembershipMutationsOptions = {
  selectedMember: SelectedMemberLike;
  setPurchaseProductDetail: (value: null) => void;
  setMemberMembershipsByMemberId: React.Dispatch<React.SetStateAction<Record<number, PurchasedMembership[]>>>;
  setMemberPaymentsByMemberId: React.Dispatch<React.SetStateAction<Record<number, PurchasePayment[]>>>;
  invalidateQueries: (...domains: ("members" | "products" | "reservationTargets" | "reservationSchedules" | "workspaceMemberSearch")[]) => void;
  refreshSelectedMember: (memberId: number) => Promise<unknown>;
  parseRequiredNumber: (value: string) => number;
  normalizeOptionalText: (value: string) => string | null;
  formatError: (error: unknown) => string;
};

export function buildHoldPreview(membership: PurchasedMembership, draft: MembershipActionDraft) {
  if (membership.membershipStatus !== "ACTIVE") {
    return null;
  }

  if (!draft.holdStartDate || !draft.holdEndDate) {
    return { error: "홀딩 시작일/종료일을 입력해주세요." } as const;
  }

  const start = new Date(`${draft.holdStartDate}T00:00:00`);
  const end = new Date(`${draft.holdEndDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "홀딩 날짜 형식이 올바르지 않습니다." } as const;
  }
  if (end < start) {
    return { error: "홀딩 종료일은 시작일보다 빠를 수 없습니다." } as const;
  }

  const plannedHoldDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  let recalculatedEndDate: string | null = null;
  if (membership.endDate) {
    const baseEnd = new Date(`${membership.endDate}T00:00:00`);
    baseEnd.setDate(baseEnd.getDate() + plannedHoldDays);
    recalculatedEndDate = baseEnd.toISOString().slice(0, 10);
  }

  return {
    plannedHoldDays,
    recalculatedEndDate
  } as const;
}

export function buildResumePreview(membership: PurchasedMembership, draft: MembershipActionDraft) {
  if (membership.membershipStatus !== "HOLDING") {
    return null;
  }
  if (!draft.resumeDate) {
    return { error: "해제일을 입력해주세요." } as const;
  }
  const holdStart = new Date(`${draft.holdStartDate}T00:00:00`);
  const resumeDate = new Date(`${draft.resumeDate}T00:00:00`);
  if (Number.isNaN(holdStart.getTime()) || Number.isNaN(resumeDate.getTime())) {
    return { error: "해제 날짜 형식이 올바르지 않습니다." } as const;
  }
  if (resumeDate < holdStart) {
    return { error: "해제일은 홀딩 시작일보다 빠를 수 없습니다." } as const;
  }
  const actualHoldDays = Math.floor((resumeDate.getTime() - holdStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  let recalculatedEndDate: string | null = null;
  if (membership.endDate) {
    const currentEnd = new Date(`${membership.endDate}T00:00:00`);
    currentEnd.setDate(currentEnd.getDate() + actualHoldDays);
    recalculatedEndDate = currentEnd.toISOString().slice(0, 10);
  }
  return { actualHoldDays, recalculatedEndDate } as const;
}

export function useMembershipMutations({
  selectedMember,
  setPurchaseProductDetail,
  setMemberMembershipsByMemberId,
  setMemberPaymentsByMemberId,
  invalidateQueries,
  refreshSelectedMember,
  parseRequiredNumber,
  normalizeOptionalText,
  formatError
}: UseMembershipMutationsOptions) {
  const workspace = useMembershipWorkspaceState(selectedMember?.memberId ?? null);
  const {
    purchaseForm,
    setPurchaseForm,
    memberPurchaseSubmitting,
    setMemberPurchaseSubmitting,
    memberPurchaseMessage,
    setMemberPurchaseMessage,
    memberPurchaseError,
    setMemberPurchaseError,
    membershipActionDrafts,
    setMembershipActionDrafts,
    membershipActionSubmittingId,
    setMembershipActionSubmittingId,
    membershipActionMessageById,
    setMembershipActionMessageById,
    membershipActionErrorById,
    setMembershipActionErrorById,
    membershipRefundPreviewById,
    setMembershipRefundPreviewById,
    membershipRefundPreviewLoadingId,
    setMembershipRefundPreviewLoadingId,
    resetMembershipWorkspace
  } = workspace;

  function updateMembershipActionDraft(
    membershipId: number,
    updater: (draft: MembershipActionDraft) => MembershipActionDraft
  ) {
    setMembershipActionDrafts((prev) => {
      const current = prev[membershipId] ?? createDefaultMembershipActionDraft();
      return {
        ...prev,
        [membershipId]: updater(current)
      };
    });
    setMembershipRefundPreviewById((prev) => {
      if (!(membershipId in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[membershipId];
      return next;
    });
  }

  function getMembershipActionDraft(membershipId: number): MembershipActionDraft {
    return membershipActionDrafts[membershipId] ?? createDefaultMembershipActionDraft();
  }

  function patchSessionMembership(memberId: number, updatedMembership: PurchasedMembership) {
    setMemberMembershipsByMemberId((prev) => {
      const currentRows = prev[memberId] ?? [];
      return {
        ...prev,
        [memberId]: currentRows.map((row) =>
          row.membershipId === updatedMembership.membershipId ? updatedMembership : row
        )
      };
    });
  }

  async function handleMembershipPurchaseSubmit(
    event: React.FormEvent<HTMLFormElement>,
    options: {
      purchaseProductDetail: unknown;
      purchasePreview: PurchasePreviewLike;
    }
  ) {
    event.preventDefault();
    if (!selectedMember) {
      setMemberPurchaseError("구매할 회원을 먼저 선택해주세요.");
      return;
    }
    if (!purchaseForm.productId) {
      setMemberPurchaseError("구매할 상품을 선택해주세요.");
      return;
    }
    if (!options.purchaseProductDetail) {
      setMemberPurchaseError("상품 상세 정보를 불러오는 중이거나 선택되지 않았습니다.");
      return;
    }
    if (options.purchasePreview && "error" in options.purchasePreview) {
      setMemberPurchaseError(options.purchasePreview.error ?? "구매 미리보기를 확인해주세요.");
      return;
    }

    setMemberPurchaseSubmitting(true);
    setMemberPurchaseError(null);
    setMemberPurchaseMessage(null);
    try {
      const response = await apiPost<PurchaseMembershipResponse>(
        `/api/v1/members/${selectedMember.memberId}/memberships`,
        {
          productId: Number.parseInt(purchaseForm.productId, 10),
          startDate: purchaseForm.startDate || null,
          paidAmount: purchaseForm.paidAmount.trim() ? parseRequiredNumber(purchaseForm.paidAmount) : null,
          paymentMethod: purchaseForm.paymentMethod,
          membershipMemo: normalizeOptionalText(purchaseForm.membershipMemo),
          paymentMemo: normalizeOptionalText(purchaseForm.paymentMemo)
        }
      );

      setMemberPurchaseMessage(response.message);
      setMemberMembershipsByMemberId((prev) => {
        const currentRows = prev[selectedMember.memberId] ?? [];
        return {
          ...prev,
          [selectedMember.memberId]: [response.data.membership, ...currentRows]
        };
      });
      invalidateQueries("members", "reservationTargets", "workspaceMemberSearch");
      setMemberPaymentsByMemberId((prev) => {
        const currentRows = prev[selectedMember.memberId] ?? [];
        return {
          ...prev,
          [selectedMember.memberId]: [response.data.payment, ...currentRows]
        };
      });
      setMembershipActionDrafts((prev) => ({
        ...prev,
        [response.data.membership.membershipId]: createDefaultMembershipActionDraft()
      }));
      setPurchaseForm(createEmptyPurchaseForm());
      setPurchaseProductDetail(null);
      await refreshSelectedMember(selectedMember.memberId);
    } catch (error) {
      setMemberPurchaseError(formatError(error));
    } finally {
      setMemberPurchaseSubmitting(false);
    }
  }

  async function handleMembershipHoldSubmit(membership: PurchasedMembership) {
    if (!selectedMember) {
      return;
    }
    const draft = getMembershipActionDraft(membership.membershipId);
    const preview = buildHoldPreview(membership, draft);
    if (preview && "error" in preview) {
      setMembershipActionErrorById((prev) => ({
        ...prev,
        [membership.membershipId]: preview.error ?? "홀딩 미리보기를 확인해주세요."
      }));
      setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: "" }));
      return;
    }

    setMembershipActionSubmittingId(membership.membershipId);
    setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    try {
      const response = await apiPost<HoldMembershipResponse>(
        `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/hold`,
        {
          holdStartDate: draft.holdStartDate || null,
          holdEndDate: draft.holdEndDate || null,
          reason: normalizeOptionalText(draft.holdReason),
          memo: normalizeOptionalText(draft.holdMemo)
        }
      );

      patchSessionMembership(membership.memberId, response.data.membership);
      invalidateQueries("members", "reservationTargets", "workspaceMemberSearch");
      setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: response.message }));
      setMembershipActionDrafts((prev) => ({
        ...prev,
        [membership.membershipId]: {
          ...(prev[membership.membershipId] ?? createDefaultMembershipActionDraft()),
          holdStartDate: response.data.hold.holdStartDate,
          holdEndDate: response.data.hold.holdEndDate,
          resumeDate: response.data.hold.holdEndDate
        }
      }));
      await refreshSelectedMember(membership.memberId);
    } catch (error) {
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: formatError(error) }));
    } finally {
      setMembershipActionSubmittingId(null);
    }
  }

  async function handleMembershipResumeSubmit(membership: PurchasedMembership) {
    if (!selectedMember) {
      return;
    }
    const draft = getMembershipActionDraft(membership.membershipId);
    const preview = buildResumePreview(membership, draft);
    if (preview && "error" in preview) {
      setMembershipActionErrorById((prev) => ({
        ...prev,
        [membership.membershipId]: preview.error ?? "홀딩 해제 미리보기를 확인해주세요."
      }));
      setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: "" }));
      return;
    }

    setMembershipActionSubmittingId(membership.membershipId);
    setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    try {
      const response = await apiPost<ResumeMembershipResponse>(
        `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/resume`,
        {
          resumeDate: draft.resumeDate || null
        }
      );

      patchSessionMembership(membership.memberId, response.data.membership);
      invalidateQueries("members", "reservationTargets", "workspaceMemberSearch");
      setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: response.message }));
      await refreshSelectedMember(membership.memberId);
    } catch (error) {
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: formatError(error) }));
    } finally {
      setMembershipActionSubmittingId(null);
    }
  }

  async function handleMembershipRefundPreview(membership: PurchasedMembership) {
    if (!selectedMember) {
      return;
    }
    const draft = getMembershipActionDraft(membership.membershipId);

    setMembershipRefundPreviewLoadingId(membership.membershipId);
    setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    try {
      const response = await apiPost<RefundPreviewResponse>(
        `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/refund/preview`,
        {
          refundDate: draft.refundDate || null
        }
      );
      setMembershipRefundPreviewById((prev) => ({
        ...prev,
        [membership.membershipId]: response.data.calculation
      }));
      setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: response.message }));
    } catch (error) {
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: formatError(error) }));
    } finally {
      setMembershipRefundPreviewLoadingId(null);
    }
  }

  async function handleMembershipRefundSubmit(membership: PurchasedMembership) {
    if (!selectedMember) {
      return;
    }
    const draft = getMembershipActionDraft(membership.membershipId);
    setMembershipActionSubmittingId(membership.membershipId);
    setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: "" }));
    try {
      const response = await apiPost<RefundMembershipResponse>(
        `/api/v1/members/${membership.memberId}/memberships/${membership.membershipId}/refund`,
        {
          refundDate: draft.refundDate || null,
          refundPaymentMethod: draft.refundPaymentMethod,
          refundReason: normalizeOptionalText(draft.refundReason),
          refundMemo: normalizeOptionalText(draft.refundMemo),
          paymentMemo: normalizeOptionalText(draft.refundPaymentMemo)
        }
      );

      patchSessionMembership(membership.memberId, response.data.membership);
      invalidateQueries("members", "reservationTargets", "workspaceMemberSearch");
      setMemberPaymentsByMemberId((prev) => {
        const currentRows = prev[selectedMember.memberId] ?? [];
        return {
          ...prev,
          [selectedMember.memberId]: [response.data.payment, ...currentRows]
        };
      });
      setMembershipRefundPreviewById((prev) => ({
        ...prev,
        [membership.membershipId]: response.data.calculation
      }));
      setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: response.message }));
      await refreshSelectedMember(membership.memberId);
    } catch (error) {
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: formatError(error) }));
    } finally {
      setMembershipActionSubmittingId(null);
    }
  }

  return {
    purchaseForm,
    setPurchaseForm,
    memberPurchaseSubmitting,
    setMemberPurchaseSubmitting,
    memberPurchaseMessage,
    setMemberPurchaseMessage,
    memberPurchaseError,
    setMemberPurchaseError,
    membershipActionDrafts,
    membershipActionSubmittingId,
    membershipActionMessageById,
    membershipActionErrorById,
    membershipRefundPreviewById,
    membershipRefundPreviewLoadingId,
    resetMembershipWorkspace,
    updateMembershipActionDraft,
    getMembershipActionDraft,
    handleMembershipPurchaseSubmit,
    handleMembershipHoldSubmit,
    handleMembershipResumeSubmit,
    handleMembershipRefundPreview,
    handleMembershipRefundSubmit,
    buildHoldPreview,
    buildResumePreview
  } as const;
}
