import { useEffect, useMemo, useRef, useState } from "react";

import type { MembershipPaymentRecord, PurchasedMembership } from "../../members/modules/types";
import type { ProductRecord } from "../../products/modules/types";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "ETC";

type PurchaseFormState = {
  productId: string;
  startDate: string;
  paymentMethod: PaymentMethod;
  paidAmount: string;
  membershipMemo: string;
  paymentMemo: string;
};

type MembershipActionDraft = {
  holdStartDate: string;
  holdEndDate: string;
  holdReason: string;
  resumeDate: string;
  refundDate: string;
  refundPaymentMethod: PaymentMethod;
  refundReason: string;
  refundMemo: string;
};

type RefundPreview = {
  refundDate: string;
  originalAmount: number;
  usedAmount: number;
  penaltyAmount: number;
  refundAmount: number;
};

type CreateLocalMembership = (input: {
  memberId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
}) => PurchasedMembership;

type PatchLocalMembership = (
  membershipId: number,
  updater: (membership: PurchasedMembership) => PurchasedMembership
) => void;

type UseMembershipPrototypeStateArgs = {
  selectedMemberId: number | null;
  availableProducts: ProductRecord[];
  createLocalMembership: CreateLocalMembership;
  patchLocalMembership: PatchLocalMembership;
};

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function nowText() {
  return new Date().toISOString();
}

function addDays(dateText: string, days: number) {
  const next = new Date(`${dateText}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function dateDiffInDays(startDate: string, endDate: string) {
  return (Date.parse(`${endDate}T00:00:00`) - Date.parse(`${startDate}T00:00:00`)) / 86400000 + 1;
}

function createEmptyPurchaseForm(): PurchaseFormState {
  return {
    productId: "",
    startDate: todayText(),
    paymentMethod: "CASH",
    paidAmount: "",
    membershipMemo: "",
    paymentMemo: ""
  };
}

function createDefaultMembershipActionDraft(): MembershipActionDraft {
  const today = todayText();
  return {
    holdStartDate: today,
    holdEndDate: today,
    holdReason: "",
    resumeDate: today,
    refundDate: today,
    refundPaymentMethod: "CASH",
    refundReason: "",
    refundMemo: ""
  };
}

export function useMembershipPrototypeState(args: UseMembershipPrototypeStateArgs) {
  const { selectedMemberId, availableProducts, createLocalMembership, patchLocalMembership } = args;
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(() => createEmptyPurchaseForm());
  const [payments, setPayments] = useState<MembershipPaymentRecord[]>([]);
  const [membershipActionDrafts, setMembershipActionDrafts] = useState<Record<number, MembershipActionDraft>>({});
  const [membershipPanelMessage, setMembershipPanelMessage] = useState<string | null>(null);
  const [membershipPanelError, setMembershipPanelError] = useState<string | null>(null);
  const [membershipRefundPreviewById, setMembershipRefundPreviewById] = useState<Record<number, RefundPreview>>({});
  const paymentIdSeedRef = useRef(88000);

  useEffect(() => {
    setPurchaseForm(createEmptyPurchaseForm());
    setPayments([]);
    setMembershipActionDrafts({});
    setMembershipPanelMessage(null);
    setMembershipPanelError(null);
    setMembershipRefundPreviewById({});
  }, [selectedMemberId]);

  const purchasePreview = useMemo(() => {
    const product = availableProducts.find((item) => String(item.productId) === purchaseForm.productId);
    if (!product) {
      return null;
    }

    const chargeAmount = purchaseForm.paidAmount ? Number(purchaseForm.paidAmount) : product.priceAmount;
    return {
      product,
      startDate: purchaseForm.startDate,
      endDate: product.productType === "DURATION" ? addDays(purchaseForm.startDate, (product.validityDays ?? 1) - 1) : null,
      remainingCount: product.productType === "COUNT" ? (product.totalCount ?? 0) : null,
      chargeAmount
    };
  }, [availableProducts, purchaseForm]);

  function clearPanelFeedback() {
    setMembershipPanelMessage(null);
    setMembershipPanelError(null);
  }

  function getMembershipActionDraft(membershipId: number) {
    return membershipActionDrafts[membershipId] ?? createDefaultMembershipActionDraft();
  }

  function updateMembershipActionDraft(
    membershipId: number,
    updater: (draft: MembershipActionDraft) => MembershipActionDraft
  ) {
    setMembershipActionDrafts((prev) => {
      const current = prev[membershipId] ?? createDefaultMembershipActionDraft();
      return { ...prev, [membershipId]: updater(current) };
    });
  }

  function appendPayment(record: Omit<MembershipPaymentRecord, "paymentId" | "paidAt">) {
    paymentIdSeedRef.current += 1;
    const nextPayment: MembershipPaymentRecord = {
      paymentId: paymentIdSeedRef.current,
      paidAt: nowText(),
      ...record
    };
    setPayments((prev) => [nextPayment, ...prev]);
    return nextPayment;
  }

  function buildMembershipFromPreview(memberId: number) {
    if (!purchasePreview) {
      return null;
    }

    return {
      memberId,
      productNameSnapshot: purchasePreview.product.productName,
      productTypeSnapshot: purchasePreview.product.productType,
      startDate: purchasePreview.startDate,
      endDate: purchasePreview.endDate,
      remainingCount: purchasePreview.remainingCount
    } as const;
  }

  function buildHoldPreview(membership: PurchasedMembership) {
    const draft = getMembershipActionDraft(membership.membershipId);
    if (!draft.holdStartDate || !draft.holdEndDate || draft.holdEndDate < draft.holdStartDate) {
      return { error: "홀딩 종료일은 시작일 이후여야 합니다." } as const;
    }

    const plannedHoldDays = dateDiffInDays(draft.holdStartDate, draft.holdEndDate);
    return {
      plannedHoldDays,
      recalculatedEndDate: membership.endDate ? addDays(membership.endDate, plannedHoldDays) : null
    } as const;
  }

  function buildResumePreview(membership: PurchasedMembership) {
    const draft = getMembershipActionDraft(membership.membershipId);
    if (!draft.resumeDate) {
      return { error: "해제일을 입력해야 합니다." } as const;
    }

    const holdPreview = buildHoldPreview(membership);
    if ("error" in holdPreview) {
      return holdPreview;
    }

    return {
      actualHoldDays: holdPreview.plannedHoldDays,
      recalculatedEndDate: membership.endDate ? addDays(membership.endDate, holdPreview.plannedHoldDays) : null
    } as const;
  }

  function buildRefundPreview(membership: PurchasedMembership) {
    const draft = getMembershipActionDraft(membership.membershipId);
    if (!draft.refundDate) {
      return { error: "환불 기준일을 입력해야 합니다." } as const;
    }

    const originalAmount = membership.productTypeSnapshot === "COUNT" ? 550000 : 180000;
    const usedAmount =
      membership.productTypeSnapshot === "COUNT"
        ? Math.max(0, 10 - (membership.remainingCount ?? 0)) * 30000
        : Math.round(originalAmount * 0.35);
    const penaltyAmount = Math.round(originalAmount * 0.1);
    const refundAmount = Math.max(0, originalAmount - usedAmount - penaltyAmount);

    return {
      refundDate: draft.refundDate,
      originalAmount,
      usedAmount,
      penaltyAmount,
      refundAmount
    } as const;
  }

  function handlePurchaseSubmit() {
    clearPanelFeedback();

    if (selectedMemberId == null) {
      setMembershipPanelError("회원을 먼저 선택해야 합니다.");
      return null;
    }

    const membershipInput = buildMembershipFromPreview(selectedMemberId);
    if (!membershipInput || !purchasePreview) {
      setMembershipPanelError("상품을 선택해야 합니다.");
      return null;
    }

    const membership = createLocalMembership(membershipInput);
    appendPayment({
      membershipId: membership.membershipId,
      paymentType: "PURCHASE",
      paymentStatus: "PAID",
      paymentMethod: purchaseForm.paymentMethod,
      amount: purchasePreview.chargeAmount,
      memo: purchaseForm.paymentMemo || purchaseForm.membershipMemo || null
    });
    setPurchaseForm(createEmptyPurchaseForm());
    setMembershipPanelMessage(`회원권 #${membership.membershipId}를 생성했습니다.`);
    return membership;
  }

  function handleHoldSubmit(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = buildHoldPreview(membership);
    if ("error" in preview) {
      setMembershipPanelError(preview.error ?? "홀딩 미리보기를 계산하지 못했습니다.");
      return;
    }

    patchLocalMembership(membership.membershipId, (current) => ({
      ...current,
      membershipStatus: "HOLDING",
      endDate: preview.recalculatedEndDate,
      activeHoldStatus: "ACTIVE"
    }));
    setMembershipPanelMessage(`회원권 #${membership.membershipId}를 홀딩했습니다.`);
  }

  function handleResumeSubmit(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = buildResumePreview(membership);
    if ("error" in preview) {
      setMembershipPanelError(preview.error ?? "홀딩 해제 미리보기를 계산하지 못했습니다.");
      return;
    }

    patchLocalMembership(membership.membershipId, (current) => ({
      ...current,
      membershipStatus: "ACTIVE",
      endDate: preview.recalculatedEndDate,
      activeHoldStatus: null
    }));
    setMembershipPanelMessage(`회원권 #${membership.membershipId} 홀딩을 해제했습니다.`);
  }

  function handleRefundPreview(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = buildRefundPreview(membership);
    if ("error" in preview) {
      setMembershipPanelError(preview.error ?? "환불 미리보기를 계산하지 못했습니다.");
      return null;
    }
    setMembershipRefundPreviewById((prev) => ({ ...prev, [membership.membershipId]: preview }));
    return preview;
  }

  function handleRefundSubmit(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = handleRefundPreview(membership);
    if (!preview) {
      return;
    }

    patchLocalMembership(membership.membershipId, (current) => ({
      ...current,
      membershipStatus: "REFUNDED",
      activeHoldStatus: null
    }));
    appendPayment({
      membershipId: membership.membershipId,
      paymentType: "REFUND",
      paymentStatus: "REFUNDED",
      paymentMethod: getMembershipActionDraft(membership.membershipId).refundPaymentMethod,
      amount: -preview.refundAmount,
      memo: getMembershipActionDraft(membership.membershipId).refundMemo || null
    });
    setMembershipPanelMessage(`회원권 #${membership.membershipId}를 환불 처리했습니다.`);
  }

  return {
    purchaseForm,
    setPurchaseForm,
    purchasePreview,
    payments,
    membershipPanelMessage,
    membershipPanelError,
    clearPanelFeedback,
    getMembershipActionDraft,
    updateMembershipActionDraft,
    membershipRefundPreviewById,
    buildHoldPreview,
    buildResumePreview,
    handlePurchaseSubmit,
    handleHoldSubmit,
    handleResumeSubmit,
    handleRefundPreview,
    handleRefundSubmit
  } as const;
}
