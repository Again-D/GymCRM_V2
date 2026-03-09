import { useEffect, useState } from "react";

export type PurchaseFormState = {
  productId: string;
  startDate: string;
  paidAmount: string;
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "ETC";
  membershipMemo: string;
  paymentMemo: string;
};

export type MembershipActionDraft = {
  holdStartDate: string;
  holdEndDate: string;
  holdReason: string;
  holdMemo: string;
  resumeDate: string;
  refundDate: string;
  refundPaymentMethod: "CASH" | "CARD" | "TRANSFER" | "ETC";
  refundReason: string;
  refundMemo: string;
  refundPaymentMemo: string;
};

export type RefundCalculationApi = {
  refundDate: string;
  originalAmount: number;
  usedAmount: number;
  penaltyAmount: number;
  refundAmount: number;
};

export const EMPTY_PURCHASE_FORM: PurchaseFormState = {
  productId: "",
  startDate: new Date().toISOString().slice(0, 10),
  paidAmount: "",
  paymentMethod: "CASH",
  membershipMemo: "",
  paymentMemo: ""
};

export function createDefaultMembershipActionDraft(): MembershipActionDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    holdStartDate: today,
    holdEndDate: today,
    holdReason: "",
    holdMemo: "",
    resumeDate: today,
    refundDate: today,
    refundPaymentMethod: "CASH",
    refundReason: "",
    refundMemo: "",
    refundPaymentMemo: ""
  };
}

export function useMembershipWorkspaceState(selectedMemberId: number | null) {
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(EMPTY_PURCHASE_FORM);
  const [memberPurchaseSubmitting, setMemberPurchaseSubmitting] = useState(false);
  const [memberPurchaseMessage, setMemberPurchaseMessage] = useState<string | null>(null);
  const [memberPurchaseError, setMemberPurchaseError] = useState<string | null>(null);
  const [membershipActionDrafts, setMembershipActionDrafts] = useState<Record<number, MembershipActionDraft>>({});
  const [membershipActionSubmittingId, setMembershipActionSubmittingId] = useState<number | null>(null);
  const [membershipActionMessageById, setMembershipActionMessageById] = useState<Record<number, string>>({});
  const [membershipActionErrorById, setMembershipActionErrorById] = useState<Record<number, string>>({});
  const [membershipRefundPreviewById, setMembershipRefundPreviewById] = useState<Record<number, RefundCalculationApi>>(
    {}
  );
  const [membershipRefundPreviewLoadingId, setMembershipRefundPreviewLoadingId] = useState<number | null>(null);

  useEffect(() => {
    setPurchaseForm({ ...EMPTY_PURCHASE_FORM });
    setMemberPurchaseSubmitting(false);
    setMemberPurchaseMessage(null);
    setMemberPurchaseError(null);
    setMembershipActionDrafts({});
    setMembershipActionSubmittingId(null);
    setMembershipActionMessageById({});
    setMembershipActionErrorById({});
    setMembershipRefundPreviewById({});
    setMembershipRefundPreviewLoadingId(null);
  }, [selectedMemberId]);

  function resetMembershipWorkspace() {
    setPurchaseForm({ ...EMPTY_PURCHASE_FORM });
    setMemberPurchaseSubmitting(false);
    setMemberPurchaseMessage(null);
    setMemberPurchaseError(null);
    setMembershipActionDrafts({});
    setMembershipActionSubmittingId(null);
    setMembershipActionMessageById({});
    setMembershipActionErrorById({});
    setMembershipRefundPreviewById({});
    setMembershipRefundPreviewLoadingId(null);
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
  };
}
