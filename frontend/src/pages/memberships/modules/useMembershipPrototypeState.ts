import { useEffect, useMemo, useRef, useState } from "react";

import type {
  MembershipPaymentRecord,
  PurchasedMembership,
} from "../../members/modules/types";
import type { ProductRecord } from "../../products/modules/types";
import { addDaysToLocalDate, todayLocalDate } from "../../../shared/date";

type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "ETC";

type PurchaseFormState = {
  productId: string;
  assignedTrainerId: string;
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

type CreateMembership = (input: {
  productId: number;
  memberId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  assignedTrainerId: number | null;
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
  paymentMethod: PaymentMethod;
  paidAmount: number | null;
  membershipMemo: string | null;
  paymentMemo: string | null;
}) => Promise<{
  membership: PurchasedMembership;
  payment: MembershipPaymentRecord;
}>;

type HoldMembership = (
  membership: PurchasedMembership,
  input: {
    holdStartDate: string;
    holdEndDate: string;
    reason?: string | null;
    memo?: string | null;
  },
) => Promise<{ membership: PurchasedMembership }>;

type ResumeMembership = (
  membership: PurchasedMembership,
  input: { resumeDate: string },
) => Promise<{ membership: PurchasedMembership }>;

type PreviewRefund = (
  membership: PurchasedMembership,
  input: { refundDate: string },
) => Promise<{ calculation: RefundPreview }>;

type RefundMembership = (
  membership: PurchasedMembership,
  input: {
    refundDate: string;
    refundPaymentMethod: PaymentMethod;
    refundReason?: string | null;
    refundMemo?: string | null;
    paymentMemo?: string | null;
  },
) => Promise<{
  membership: PurchasedMembership;
  payment: MembershipPaymentRecord;
  calculation: RefundPreview;
}>;

type UseMembershipPrototypeStateArgs = {
  selectedMemberId: number | null;
  availableProducts: ProductRecord[];
  createMembership: CreateMembership;
  holdMembership: HoldMembership;
  resumeMembership: ResumeMembership;
  previewMembershipRefund: PreviewRefund;
  refundMembership: RefundMembership;
};

function todayText() {
  return todayLocalDate();
}

function nowText() {
  return new Date().toISOString();
}

function addDays(dateText: string, days: number) {
  return addDaysToLocalDate(dateText, days);
}

function dateDiffInDays(startDate: string, endDate: string) {
  return (
    (Date.parse(`${endDate}T00:00:00`) - Date.parse(`${startDate}T00:00:00`)) /
      86400000 +
    1
  );
}

function createEmptyPurchaseForm(): PurchaseFormState {
  return {
    productId: "",
    assignedTrainerId: "",
    startDate: todayText(),
    paymentMethod: "CASH",
    paidAmount: "",
    membershipMemo: "",
    paymentMemo: "",
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
    refundMemo: "",
  };
}

export function useMembershipPrototypeState(
  args: UseMembershipPrototypeStateArgs,
) {
  const {
    selectedMemberId,
    availableProducts,
    createMembership,
    holdMembership,
    resumeMembership,
    previewMembershipRefund,
    refundMembership,
  } = args;
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(() =>
    createEmptyPurchaseForm(),
  );
  const [payments, setPayments] = useState<MembershipPaymentRecord[]>([]);
  const [membershipActionDrafts, setMembershipActionDrafts] = useState<
    Record<number, MembershipActionDraft>
  >({});
  const [membershipPanelMessage, setMembershipPanelMessage] = useState<
    string | null
  >(null);
  const [membershipPanelError, setMembershipPanelError] = useState<
    string | null
  >(null);
  const [membershipRefundPreviewById, setMembershipRefundPreviewById] =
    useState<Record<number, RefundPreview>>({});
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
    const product = availableProducts.find(
      (item) => String(item.productId) === purchaseForm.productId,
    );
    if (!product) {
      return null;
    }

    const chargeAmount = purchaseForm.paidAmount
      ? Number(purchaseForm.paidAmount)
      : product.priceAmount;
    return {
      product,
      startDate: purchaseForm.startDate,
      endDate:
        product.productType === "DURATION"
          ? addDays(purchaseForm.startDate, (product.validityDays ?? 1) - 1)
          : null,
      remainingCount:
        product.productType === "COUNT" ? (product.totalCount ?? 0) : null,
      chargeAmount,
    };
  }, [availableProducts, purchaseForm]);

  function clearPanelFeedback() {
    setMembershipPanelMessage(null);
    setMembershipPanelError(null);
  }

  function getMembershipActionDraft(membershipId: number) {
    return (
      membershipActionDrafts[membershipId] ??
      createDefaultMembershipActionDraft()
    );
  }

  function updateMembershipActionDraft(
    membershipId: number,
    updater: (draft: MembershipActionDraft) => MembershipActionDraft,
  ) {
    setMembershipActionDrafts((prev) => {
      const current =
        prev[membershipId] ?? createDefaultMembershipActionDraft();
      return { ...prev, [membershipId]: updater(current) };
    });
  }

  function appendPayment(
    record:
      | MembershipPaymentRecord
      | Omit<MembershipPaymentRecord, "paymentId" | "paidAt">,
  ) {
    const nextPayment: MembershipPaymentRecord =
      "paymentId" in record && "paidAt" in record
        ? record
        : {
            paymentId: (paymentIdSeedRef.current += 1),
            paidAt: nowText(),
            ...record,
          };
    paymentIdSeedRef.current = Math.max(
      paymentIdSeedRef.current,
      nextPayment.paymentId,
    );
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
      remainingCount: purchasePreview.remainingCount,
    } as const;
  }

  function buildHoldPreview(membership: PurchasedMembership) {
    const draft = getMembershipActionDraft(membership.membershipId);
    if (
      !draft.holdStartDate ||
      !draft.holdEndDate ||
      draft.holdEndDate < draft.holdStartDate
    ) {
      return { error: "홀딩 종료일은 시작일 이후여야 합니다." } as const;
    }

    const plannedHoldDays = dateDiffInDays(
      draft.holdStartDate,
      draft.holdEndDate,
    );
    return {
      plannedHoldDays,
      recalculatedEndDate: membership.endDate
        ? addDays(membership.endDate, plannedHoldDays)
        : null,
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
      recalculatedEndDate: membership.endDate
        ? addDays(membership.endDate, holdPreview.plannedHoldDays)
        : null,
    } as const;
  }

  function buildRefundPreview(membership: PurchasedMembership) {
    const draft = getMembershipActionDraft(membership.membershipId);
    if (!draft.refundDate) {
      return { error: "환불 기준일을 입력해야 합니다." } as const;
    }

    const originalAmount =
      membership.productTypeSnapshot === "COUNT" ? 550000 : 180000;
    const usedAmount =
      membership.productTypeSnapshot === "COUNT"
        ? Math.max(0, 10 - (membership.remainingCount ?? 0)) * 30000
        : Math.round(originalAmount * 0.35);
    const penaltyAmount = Math.round(originalAmount * 0.1);
    const refundAmount = Math.max(
      0,
      originalAmount - usedAmount - penaltyAmount,
    );

    return {
      refundDate: draft.refundDate,
      originalAmount,
      usedAmount,
      penaltyAmount,
      refundAmount,
    } as const;
  }

  async function handlePurchaseSubmit() {
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
    if (
      purchasePreview.product.productCategory === "PT" &&
      !purchaseForm.assignedTrainerId
    ) {
      setMembershipPanelError("PT 상품은 담당 트레이너를 선택해야 합니다.");
      return null;
    }

    try {
      const result = await createMembership({
        ...membershipInput,
        productId: purchasePreview.product.productId,
        assignedTrainerId: purchaseForm.assignedTrainerId
          ? Number(purchaseForm.assignedTrainerId)
          : null,
        paymentMethod: purchaseForm.paymentMethod,
        paidAmount: purchasePreview.chargeAmount,
        membershipMemo: purchaseForm.membershipMemo || null,
        paymentMemo:
          purchaseForm.paymentMemo || purchaseForm.membershipMemo || null,
      });
      appendPayment(result.payment);
      setPurchaseForm(createEmptyPurchaseForm());
      setMembershipPanelMessage(
        `회원권 #${result.membership.membershipId}를 생성했습니다.`,
      );
      return result.membership;
    } catch (error) {
      setMembershipPanelError(
        error instanceof Error ? error.message : "회원권 생성에 실패했습니다.",
      );
      return null;
    }
  }

  async function handleHoldSubmit(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = buildHoldPreview(membership);
    if ("error" in preview) {
      setMembershipPanelError(
        preview.error ?? "홀딩 미리보기를 계산하지 못했습니다.",
      );
      return;
    }

    try {
      await holdMembership(membership, {
        holdStartDate: getMembershipActionDraft(membership.membershipId)
          .holdStartDate,
        holdEndDate: getMembershipActionDraft(membership.membershipId)
          .holdEndDate,
        reason:
          getMembershipActionDraft(membership.membershipId).holdReason || null,
        memo: null,
      });
      setMembershipPanelMessage(
        `회원권 #${membership.membershipId}를 홀딩했습니다.`,
      );
    } catch (error) {
      setMembershipPanelError(
        error instanceof Error ? error.message : "회원권 홀딩에 실패했습니다.",
      );
    }
  }

  async function handleResumeSubmit(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = buildResumePreview(membership);
    if ("error" in preview) {
      setMembershipPanelError(
        preview.error ?? "홀딩 해제 미리보기를 계산하지 못했습니다.",
      );
      return;
    }

    try {
      await resumeMembership(membership, {
        resumeDate: getMembershipActionDraft(membership.membershipId)
          .resumeDate,
      });
      setMembershipPanelMessage(
        `회원권 #${membership.membershipId} 홀딩을 해제했습니다.`,
      );
    } catch (error) {
      setMembershipPanelError(
        error instanceof Error ? error.message : "홀딩 해제에 실패했습니다.",
      );
    }
  }

  async function handleRefundPreview(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = buildRefundPreview(membership);
    if ("error" in preview) {
      setMembershipPanelError(
        preview.error ?? "환불 미리보기를 계산하지 못했습니다.",
      );
      return null;
    }
    try {
      const response = await previewMembershipRefund(membership, {
        refundDate: getMembershipActionDraft(membership.membershipId)
          .refundDate,
      });
      setMembershipRefundPreviewById((prev) => ({
        ...prev,
        [membership.membershipId]: response.calculation,
      }));
      return response.calculation;
    } catch (error) {
      setMembershipPanelError(
        error instanceof Error
          ? error.message
          : "환불 미리보기를 계산하지 못했습니다.",
      );
      return null;
    }
  }

  async function handleRefundSubmit(membership: PurchasedMembership) {
    clearPanelFeedback();
    const preview = await handleRefundPreview(membership);
    if (!preview) {
      return;
    }

    try {
      const result = await refundMembership(membership, {
        refundDate: getMembershipActionDraft(membership.membershipId)
          .refundDate,
        refundPaymentMethod: getMembershipActionDraft(membership.membershipId)
          .refundPaymentMethod,
        refundReason:
          getMembershipActionDraft(membership.membershipId).refundReason ||
          null,
        refundMemo:
          getMembershipActionDraft(membership.membershipId).refundMemo || null,
        paymentMemo: null,
      });
      appendPayment(result.payment);
      setMembershipRefundPreviewById((prev) => ({
        ...prev,
        [membership.membershipId]: result.calculation,
      }));
      setMembershipPanelMessage(
        `회원권 #${membership.membershipId}를 환불 처리했습니다.`,
      );
    } catch (error) {
      setMembershipPanelError(
        error instanceof Error ? error.message : "회원권 환불에 실패했습니다.",
      );
    }
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
    handleRefundSubmit,
  } as const;
}
