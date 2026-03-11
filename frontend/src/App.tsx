import { FormEvent, Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { routes } from "./app/routes";
import { ContentHeader } from "./components/layout/ContentHeader";
import { SidebarNav } from "./components/layout/SidebarNav";
import { TopBar } from "./components/layout/TopBar";
import { BootstrappingScreen } from "./features/auth/BootstrappingScreen";
import { LoginScreen } from "./features/auth/LoginScreen";
import { UnknownSecurityScreen } from "./features/auth/UnknownSecurityScreen";
import { AccessSection } from "./features/access/AccessSection";
import {
  type AccessEventRecord,
  useAccessWorkspaceState
} from "./features/access/useAccessWorkspaceState";
import { useAccessQueries } from "./features/access/useAccessQueries";
import { DashboardSection } from "./features/dashboard/DashboardSection";
import { CrmSection } from "./features/crm/CrmSection";
import {
  type CrmFilters,
  type CrmProcessResponse,
  type CrmTriggerResponse,
  useCrmWorkspaceState
} from "./features/crm/useCrmWorkspaceState";
import { useCrmHistoryQuery } from "./features/crm/useCrmHistoryQuery";
import { LockersSection } from "./features/lockers/LockersSection";
import {
  createEmptyLockerAssignForm,
  type LockerAssignment,
  type LockerAssignFormState,
  type LockerFilters,
  useLockerWorkspaceState
} from "./features/lockers/useLockerWorkspaceState";
import { useLockerQueries } from "./features/lockers/useLockerQueries";
import { MemberManagementPanels } from "./features/members/MemberManagementPanels";
import { MembersSection } from "./features/members/MembersSection";
import { type MemberSummary, useMembersQuery } from "./features/members/useMembersQuery";
import {
  createEmptyPurchaseForm,
  createDefaultMembershipActionDraft,
  type MembershipActionDraft,
  type PurchaseFormState,
  type RefundCalculationApi,
  useMembershipWorkspaceState
} from "./features/memberships/useMembershipWorkspaceState";
import { MembershipsSection } from "./features/memberships/MembershipsSection";
import { ProductsSection } from "./features/products/ProductsSection";
import {
  EMPTY_PRODUCT_FORM,
  type ProductDetail,
  type ProductFilters,
  type ProductFormState,
  useProductWorkspaceState
} from "./features/products/useProductWorkspaceState";
import { useProductsQuery } from "./features/products/useProductsQuery";
import { ReservationsSection } from "./features/reservations/ReservationsSection";
import {
  EMPTY_RESERVATION_CREATE_FORM,
  type ReservationCompleteResponse,
  type ReservationRecord,
  useReservationWorkspaceState
} from "./features/reservations/useReservationWorkspaceState";
import { isMembershipReservableOn } from "./features/reservations/reservableMemberships";
import { useReservationSchedulesQuery } from "./features/reservations/useReservationSchedulesQuery";
import { useReservationTargetsQuery } from "./features/reservations/useReservationTargetsQuery";
import { SettlementsSection } from "./features/settlements/SettlementsSection";
import {
  type SettlementReportFilters,
  useSettlementWorkspaceState
} from "./features/settlements/useSettlementWorkspaceState";
import { useSettlementReportQuery } from "./features/settlements/useSettlementReportQuery";
import { ApiClientError, apiGet, apiPatch, apiPost } from "./shared/api/client";
import { type AuthTokenResponse, type AuthUserSession, type SecurityMode, useAuthSession } from "./shared/hooks/useAuthSession";
import { useMembershipDateFilter } from "./shared/hooks/useMembershipDateFilter";
import {
  useAccessWorkspaceLoader,
  useCrmWorkspaceLoader,
  useLockerWorkspaceLoader,
  useReservationsWorkspaceLoader,
  useSettlementWorkspaceLoader
} from "./shared/hooks/useWorkspaceLoaders";
import { useWorkspaceMemberSearchLoader } from "./shared/hooks/useWorkspaceMemberSearchLoader";

function WorkspacePanelFallback() {
  return <div className="panel-placeholder">패널을 불러오는 중입니다.</div>;
}
import { detectSystemTheme, useThemePreference } from "./shared/hooks/useThemePreference";
import { formatCurrency, formatDate, formatDateTime } from "./shared/utils/format";

type NavSectionKey =
  | "dashboard"
  | "members"
  | "memberships"
  | "reservations"
  | "access"
  | "lockers"
  | "crm"
  | "settlements"
  | "products";

type MemberDetail = {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate: string | null;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
  consentSms: boolean;
  consentMarketing: boolean;
  memo: string | null;
};

type TrainerSummary = {
  userId: number;
  centerId: number;
  loginId: string;
  displayName: string;
};

const LazyMembershipOperationsPanels = lazy(async () => ({
  default: (await import("./features/memberships/MembershipOperationsPanels")).MembershipOperationsPanels
}));
const LazyReservationManagementPanels = lazy(async () => ({
  default: (await import("./features/reservations/ReservationManagementPanels")).ReservationManagementPanels
}));
const LazyAccessManagementPanels = lazy(async () => ({
  default: (await import("./features/access/AccessManagementPanels")).AccessManagementPanels
}));
const LazyLockerManagementPanels = lazy(async () => ({
  default: (await import("./features/lockers/LockerManagementPanels")).LockerManagementPanels
}));
const LazyCrmMessagePanels = lazy(async () => ({
  default: (await import("./features/crm/CrmMessagePanels")).CrmMessagePanels
}));
const LazySettlementReportPanels = lazy(async () => ({
  default: (await import("./features/settlements/SettlementReportPanels")).SettlementReportPanels
}));
const LazyProductManagementPanels = lazy(async () => ({
  default: (await import("./features/products/ProductManagementPanels")).ProductManagementPanels
}));

type PurchasedMembership = {
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
};

type PurchasePayment = {
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

type MemberFormState = {
  memberName: string;
  phone: string;
  email: string;
  gender: "" | "MALE" | "FEMALE" | "OTHER";
  birthDate: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string;
  consentSms: boolean;
  consentMarketing: boolean;
  memo: string;
};

const EMPTY_MEMBER_FORM: MemberFormState = {
  memberName: "",
  phone: "",
  email: "",
  gender: "",
  birthDate: "",
  memberStatus: "ACTIVE",
  joinDate: new Date().toISOString().slice(0, 10),
  consentSms: true,
  consentMarketing: false,
  memo: ""
};

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseOptionalInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNumber(value: string): number {
  return Number.parseFloat(value.trim());
}

function memberFormFromDetail(member: MemberDetail): MemberFormState {
  return {
    memberName: member.memberName,
    phone: member.phone,
    email: member.email ?? "",
    gender: member.gender ?? "",
    birthDate: member.birthDate ?? "",
    memberStatus: member.memberStatus,
    joinDate: member.joinDate ?? "",
    consentSms: member.consentSms,
    consentMarketing: member.consentMarketing,
    memo: member.memo ?? ""
  };
}

function productFormFromDetail(product: ProductDetail): ProductFormState {
  return {
    productName: product.productName,
    productCategory: product.productCategory ?? "",
    productType: product.productType,
    priceAmount: String(product.priceAmount ?? ""),
    validityDays: product.validityDays == null ? "" : String(product.validityDays),
    totalCount: product.totalCount == null ? "" : String(product.totalCount),
    allowHold: product.allowHold,
    maxHoldDays: product.maxHoldDays == null ? "" : String(product.maxHoldDays),
    maxHoldCount: product.maxHoldCount == null ? "" : String(product.maxHoldCount),
    allowTransfer: product.allowTransfer,
    productStatus: product.productStatus,
    description: product.description ?? ""
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const message = [error.message, error.detail].filter(Boolean).join(" / ");
    return error.traceId ? `${message} [traceId: ${error.traceId}]` : message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "알 수 없는 오류가 발생했습니다.";
}

function canCommitState(shouldCommit?: () => boolean) {
  return shouldCommit?.() ?? true;
}

function buildMemberPayload(form: MemberFormState) {
  return {
    memberName: form.memberName.trim(),
    phone: form.phone.trim(),
    email: normalizeOptionalText(form.email),
    gender: form.gender || null,
    birthDate: form.birthDate || null,
    memberStatus: form.memberStatus,
    joinDate: form.joinDate || null,
    consentSms: form.consentSms,
    consentMarketing: form.consentMarketing,
    memo: normalizeOptionalText(form.memo)
  };
}

function validateProductForm(form: ProductFormState): string | null {
  if (!form.productName.trim()) {
    return "상품명을 입력해주세요.";
  }
  if (!form.priceAmount.trim() || Number.isNaN(parseRequiredNumber(form.priceAmount))) {
    return "가격을 숫자로 입력해주세요.";
  }
  if (form.productType === "DURATION" && !parseOptionalInteger(form.validityDays)) {
    return "기간제 상품은 유효일수를 입력해야 합니다.";
  }
  if (form.productType === "COUNT" && !parseOptionalInteger(form.totalCount)) {
    return "횟수제 상품은 총 횟수를 입력해야 합니다.";
  }
  return null;
}

function buildProductPayload(form: ProductFormState) {
  const validityDays = parseOptionalInteger(form.validityDays);
  const totalCount = parseOptionalInteger(form.totalCount);

  return {
    productName: form.productName.trim(),
    productCategory: form.productCategory || null,
    productType: form.productType,
    priceAmount: parseRequiredNumber(form.priceAmount),
    validityDays: form.productType === "DURATION" ? validityDays : null,
    totalCount: form.productType === "COUNT" ? totalCount : null,
    allowHold: form.allowHold,
    maxHoldDays: form.allowHold ? parseOptionalInteger(form.maxHoldDays) : null,
    maxHoldCount: form.allowHold ? parseOptionalInteger(form.maxHoldCount) : null,
    allowTransfer: form.allowTransfer,
    productStatus: form.productStatus,
    description: normalizeOptionalText(form.description)
  };
}

function buildPurchasePreview(product: ProductDetail | null, form: PurchaseFormState) {
  if (!product) {
    return null;
  }

  const startDate = form.startDate || new Date().toISOString().slice(0, 10);
  const chargeAmount = form.paidAmount.trim() ? parseRequiredNumber(form.paidAmount) : product.priceAmount;

  if (Number.isNaN(chargeAmount) || chargeAmount < 0) {
    return {
      error: "결제금액은 0 이상의 숫자여야 합니다."
    } as const;
  }

  if (product.productType === "DURATION") {
    if (!product.validityDays || product.validityDays <= 0) {
      return { error: "선택한 기간제 상품의 유효일수 정보가 올바르지 않습니다." } as const;
    }
    const date = new Date(`${startDate}T00:00:00`);
    date.setDate(date.getDate() + product.validityDays - 1);
    return {
      startDate,
      endDate: date.toISOString().slice(0, 10),
      totalCount: null,
      remainingCount: null,
      chargeAmount
    } as const;
  }

  if (!product.totalCount || product.totalCount <= 0) {
    return { error: "선택한 횟수제 상품의 총횟수 정보가 올바르지 않습니다." } as const;
  }

  return {
    startDate,
    endDate: null,
    totalCount: product.totalCount,
    remainingCount: product.totalCount,
    chargeAmount
  } as const;
}

function buildHoldPreview(membership: PurchasedMembership, draft: MembershipActionDraft) {
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

function buildResumePreview(membership: PurchasedMembership, draft: MembershipActionDraft) {
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

export default function App() {
  const [activeNavSection, setActiveNavSection] = useState<NavSectionKey>("dashboard");
  const { themePreference, setThemePreference, resolvedTheme } = useThemePreference();
  const membershipDateFilter = useMembershipDateFilter();
  const {
    dateFilter: memberDateFilter,
    applyPreset: applyMemberDatePreset,
    setDateFrom: setMemberDateFrom,
    setDateTo: setMemberDateTo,
    reset: resetMemberDateFilter
  } = membershipDateFilter;
  const [loginIdInput, setLoginIdInput] = useState("center-admin");
  const [loginPasswordInput, setLoginPasswordInput] = useState("dev-admin-1234!");

  const [memberSearchName, setMemberSearchName] = useState("");
  const [memberSearchPhone, setMemberSearchPhone] = useState("");
  const [memberTrainerFilter, setMemberTrainerFilter] = useState("");
  const [memberProductFilter, setMemberProductFilter] = useState("");
  const [trainerOptions, setTrainerOptions] = useState<TrainerSummary[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [memberFormMode, setMemberFormMode] = useState<"create" | "edit">("create");
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [memberFormSubmitting, setMemberFormSubmitting] = useState(false);
  const [memberPanelMessage, setMemberPanelMessage] = useState<string | null>(null);
  const [memberPanelError, setMemberPanelError] = useState<string | null>(null);
  const [memberFormMessage, setMemberFormMessage] = useState<string | null>(null);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const membersPreloadPromiseRef = useRef<Promise<void> | null>(null);
  const [purchaseProductDetail, setPurchaseProductDetail] = useState<ProductDetail | null>(null);
  const [purchaseProductLoading, setPurchaseProductLoading] = useState(false);
  const [memberMembershipsByMemberId, setMemberMembershipsByMemberId] = useState<Record<number, PurchasedMembership[]>>({});
  const [memberPaymentsByMemberId, setMemberPaymentsByMemberId] = useState<Record<number, PurchasePayment[]>>({});
  const memberDetailRequestIdRef = useRef(0);
  const workspaceMemberSearch = useWorkspaceMemberSearchLoader<MemberSummary>(async (keyword) => {
    const params = new URLSearchParams();
    if (keyword) {
      params.set("keyword", keyword);
    }
    const query = params.toString();
    const response = await apiGet<MemberSummary[]>(`/api/v1/members${query ? `?${query}` : ""}`);
    return response.data;
  });
  const membershipWorkspace = useMembershipWorkspaceState(selectedMemberId);
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
    setMembershipRefundPreviewLoadingId
  } = membershipWorkspace;
  const reservationWorkspace = useReservationWorkspaceState(selectedMemberId);
  const {
    reservationRowsByMemberId,
    setReservationRowsByMemberId,
    reservationLoading,
    setReservationLoading,
    reservationCreateForm,
    setReservationCreateForm,
    reservationCreateSubmitting,
    setReservationCreateSubmitting,
    reservationActionSubmittingId,
    setReservationActionSubmittingId,
    reservationPanelMessage,
    setReservationPanelMessage,
    reservationPanelError,
    setReservationPanelError
  } = reservationWorkspace;
  const accessWorkspace = useAccessWorkspaceState();
  const {
    accessMemberQuery,
    setAccessMemberQuery,
    accessSelectedMemberId,
    setAccessSelectedMemberId,
    accessActionSubmitting,
    setAccessActionSubmitting,
    accessPanelMessage,
    setAccessPanelMessage,
    accessPanelError,
    setAccessPanelError
  } = accessWorkspace;
  const {
    accessEvents,
    accessPresence,
    accessEventsLoading,
    accessPresenceLoading,
    accessQueryError,
    reloadAccessData,
    resetAccessQueries
  } = useAccessQueries({
    formatError: errorMessage
  });
  const lockerWorkspace = useLockerWorkspaceState();
  const {
    lockerFilters,
    setLockerFilters,
    lockerAssignForm,
    setLockerAssignForm,
    lockerAssignSubmitting,
    setLockerAssignSubmitting,
    lockerReturnSubmittingId,
    setLockerReturnSubmittingId,
    lockerPanelMessage,
    setLockerPanelMessage,
    lockerPanelError,
    setLockerPanelError
  } = lockerWorkspace;
  const {
    lockerSlots,
    lockerSlotsLoading,
    lockerAssignments,
    lockerAssignmentsLoading,
    lockerQueryError,
    loadLockerSlots,
    loadLockerAssignments,
    resetLockerQueries
  } = useLockerQueries({
    getDefaultFilters: () => lockerFilters,
    formatError: errorMessage
  });
  const settlementWorkspace = useSettlementWorkspaceState();
  const {
    settlementFilters,
    setSettlementFilters,
    settlementPanelMessage,
    setSettlementPanelMessage,
    settlementPanelError,
    setSettlementPanelError
  } = settlementWorkspace;
  const crmWorkspace = useCrmWorkspaceState();
  const {
    crmFilters,
    setCrmFilters,
    crmTriggerDaysAhead,
    setCrmTriggerDaysAhead,
    crmTriggerSubmitting,
    setCrmTriggerSubmitting,
    crmProcessSubmitting,
    setCrmProcessSubmitting,
    crmPanelMessage,
    setCrmPanelMessage,
    crmPanelError,
    setCrmPanelError
  } = crmWorkspace;
  const productWorkspace = useProductWorkspaceState();
  const {
    productFilters,
    setProductFilters,
    selectedProductId,
    setSelectedProductId,
    selectedProduct,
    setSelectedProduct,
    productForm,
    setProductForm,
    productFormMode,
    setProductFormMode,
    productFormOpen,
    setProductFormOpen,
    productFormSubmitting,
    setProductFormSubmitting,
    productPanelMessage,
    setProductPanelMessage,
    productPanelError,
    setProductPanelError,
    productFormMessage,
    setProductFormMessage,
    productFormError,
    setProductFormError
  } = productWorkspace;
  const { members, setMembers, membersLoading, membersQueryError, loadMembers: runMembersQuery, resetMembersQuery } = useMembersQuery({
    getDefaultFilters: () => ({
      name: memberSearchName,
      phone: memberSearchPhone,
      trainerId: memberTrainerFilter,
      productId: memberProductFilter,
      dateFrom: memberDateFilter.dateFrom,
      dateTo: memberDateFilter.dateTo
    }),
    formatError: errorMessage
  });
  const {
    products,
    setProducts,
    productsLoading,
    productsQueryError,
    loadProducts: runProductsQuery,
    resetProductsQuery
  } = useProductsQuery({
    getDefaultFilters: () => productFilters,
    formatError: errorMessage
  });
  const {
    reservationSchedules,
    reservationSchedulesLoading,
    reservationSchedulesError,
    loadReservationSchedules,
    resetReservationSchedulesQuery
  } = useReservationSchedulesQuery({
    formatError: errorMessage
  });
  const {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    reservationTargetsLoading,
    reservationTargetsError,
    loadReservationTargets,
    resetReservationTargetsQuery
  } = useReservationTargetsQuery({
    formatError: errorMessage
  });
  const {
    settlementReport,
    settlementReportLoading,
    settlementReportError,
    settlementReportMessage,
    loadSettlementReport,
    resetSettlementReportQuery
  } = useSettlementReportQuery({
    getDefaultFilters: () => settlementFilters,
    formatError: errorMessage
  });
  const {
    crmHistoryRows,
    crmHistoryLoading,
    crmHistoryError,
    loadCrmHistory,
    resetCrmHistoryQuery
  } = useCrmHistoryQuery({
    getDefaultFilters: () => crmFilters,
    formatError: errorMessage
  });

  function clearProtectedUiState() {
    workspaceMemberSearch.invalidate();
    resetMembersQuery();
    setSelectedMemberId(null);
    setSelectedMember(null);
    setMemberForm({ ...EMPTY_MEMBER_FORM, joinDate: new Date().toISOString().slice(0, 10) });
    setMemberFormMode("create");
    setMemberFormOpen(false);
    setMemberPanelMessage(null);
    setMemberPanelError(null);
    setMemberFormMessage(null);
    setMemberFormError(null);
    setMemberSearchName("");
    setMemberSearchPhone("");
    setMemberTrainerFilter("");
    setMemberProductFilter("");
    resetMemberDateFilter();
    setTrainerOptions([]);
    membershipWorkspace.resetMembershipWorkspace();
    setPurchaseProductDetail(null);
    setMemberMembershipsByMemberId({});
    setMemberPaymentsByMemberId({});
    reservationWorkspace.resetReservationWorkspace();
    resetReservationSchedulesQuery();
    resetReservationTargetsQuery();
    accessWorkspace.resetAccessWorkspace();
    resetAccessQueries();
    lockerWorkspace.resetLockerWorkspace();
    resetLockerQueries();
    settlementWorkspace.resetSettlementWorkspace();
    resetSettlementReportQuery();
    crmWorkspace.resetCrmWorkspace();
    resetCrmHistoryQuery();
    resetProductsQuery();
    productWorkspace.resetProductWorkspace();
  }

  const {
    securityMode,
    prototypeNoAuth,
    authBootstrapping,
    authAccessToken,
    authUser,
    authStatusMessage,
    authError,
    loginSubmitting,
    isPrototypeMode,
    isJwtMode,
    isAuthenticated,
    login,
    logout
  } = useAuthSession({
    formatError: errorMessage,
    onProtectedUiReset: clearProtectedUiState
  });

  const routePreview = useMemo(() => routes.slice(0, 4), []);
  const activeProductsForPurchase = useMemo(
    () => products.filter((product) => product.productStatus === "ACTIVE"),
    [products]
  );
  const effectiveMemberPanelError = memberPanelError ?? membersQueryError;
  const effectiveReservationPanelError = reservationPanelError ?? reservationTargetsError ?? reservationSchedulesError;
  const effectiveAccessPanelError = accessPanelError ?? accessQueryError;
  const effectiveLockerPanelError = lockerPanelError ?? lockerQueryError;
  const effectiveSettlementPanelMessage = settlementPanelMessage ?? settlementReportMessage;
  const effectiveSettlementPanelError = settlementPanelError ?? settlementReportError;
  const effectiveCrmPanelError = crmPanelError ?? crmHistoryError;
  const effectiveProductPanelError = productPanelError ?? productsQueryError;
  const memberTrainerOptions =
    authUser?.roleCode === "ROLE_TRAINER"
      ? [{ userId: authUser.userId, centerId: authUser.centerId, loginId: authUser.loginId, displayName: authUser.displayName }]
      : trainerOptions;
  const purchasePreview = useMemo(
    () => buildPurchasePreview(purchaseProductDetail, purchaseForm),
    [purchaseProductDetail, purchaseForm]
  );

  async function loadMembers(filters?: {
    name?: string;
    phone?: string;
    trainerId?: string;
    productId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    setMemberPanelError(null);
    await runMembersQuery(filters);
  }

  async function loadTrainerOptions() {
    try {
      const response = await apiGet<TrainerSummary[]>("/api/v1/auth/trainers");
      setTrainerOptions(response.data);
    } catch (error) {
      setTrainerOptions([]);
      setMemberPanelError(errorMessage(error));
    }
  }

  async function loadProducts(filters?: ProductFilters) {
    setProductPanelError(null);
    await runProductsQuery(filters);
  }

  async function ensureMembersLoaded() {
    if (members.length > 0) {
      return;
    }

    const inFlight = membersPreloadPromiseRef.current;
    if (inFlight) {
      await inFlight;
      return;
    }

    const request = loadMembers();
    membersPreloadPromiseRef.current = request;

    try {
      await request;
    } finally {
      membersPreloadPromiseRef.current = null;
    }
  }

  async function loadWorkspaceMembers(keyword?: string) {
    return workspaceMemberSearch.load(keyword);
  }

  async function loadMemberMemberships(memberId: number) {
    const response = await apiGet<PurchasedMembership[]>(`/api/v1/members/${memberId}/memberships`);
    setMemberMembershipsByMemberId((prev) => ({
      ...prev,
      [memberId]: response.data
    }));
    return response.data;
  }

  function invalidateWorkspaceMemberSearchCache() {
    workspaceMemberSearch.invalidate();
  }

  async function loadMemberDetail(memberId: number, options?: { syncForm?: boolean }): Promise<boolean> {
    const requestId = memberDetailRequestIdRef.current + 1;
    memberDetailRequestIdRef.current = requestId;
    setSelectedMemberId(memberId);
    setMemberPanelError(null);
    setPurchaseProductDetail(null);
    try {
      const response = await apiGet<MemberDetail>(`/api/v1/members/${memberId}`);
      if (memberDetailRequestIdRef.current !== requestId) {
        return false;
      }
      setSelectedMember(response.data);
      await loadMemberMemberships(memberId);
      if (options?.syncForm !== false) {
        setMemberForm(memberFormFromDetail(response.data));
        setMemberFormMode("edit");
      }
      return true;
    } catch (error) {
      if (memberDetailRequestIdRef.current === requestId) {
        setMemberPanelError(errorMessage(error));
      }
      return false;
    }
  }

  async function loadProductDetail(productId: number, options?: { syncForm?: boolean }): Promise<boolean> {
    setSelectedProductId(productId);
    setProductPanelError(null);
    try {
      const response = await apiGet<ProductDetail>(`/api/v1/products/${productId}`);
      setSelectedProduct(response.data);
      if (options?.syncForm !== false) {
        setProductForm(productFormFromDetail(response.data));
        setProductFormMode("edit");
      }
      return true;
    } catch (error) {
      setProductPanelError(errorMessage(error));
      return false;
    }
  }

  async function loadPurchaseProductDetail(productId: number) {
    setPurchaseProductLoading(true);
    setMemberPurchaseError(null);
    try {
      const response = await apiGet<ProductDetail>(`/api/v1/products/${productId}`);
      setPurchaseProductDetail(response.data);
    } catch (error) {
      setPurchaseProductDetail(null);
      setMemberPurchaseError(errorMessage(error));
    } finally {
      setPurchaseProductLoading(false);
    }
  }

  async function loadReservationsForMember(memberId: number, shouldCommit?: () => boolean) {
    setReservationLoading(true);
    setReservationPanelError(null);
    try {
      const response = await apiGet<ReservationRecord[]>(`/api/v1/reservations?memberId=${memberId}`);
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setReservationRowsByMemberId((prev) => ({
        ...prev,
        [memberId]: response.data
      }));
    } catch (error) {
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setReservationPanelError(errorMessage(error));
    } finally {
      if (canCommitState(shouldCommit)) {
        setReservationLoading(false);
      }
    }
  }

  async function triggerCrmExpiryReminder() {
    setCrmTriggerSubmitting(true);
    setCrmPanelError(null);
    setCrmPanelMessage(null);
    try {
      const parsedDaysAhead = Number.parseInt(crmTriggerDaysAhead, 10);
      if (!Number.isFinite(parsedDaysAhead)) {
        setCrmPanelError("daysAhead는 숫자여야 합니다.");
        return;
      }
      const response = await apiPost<CrmTriggerResponse>("/api/v1/crm/messages/triggers/membership-expiry-reminder", {
        daysAhead: parsedDaysAhead
      });
      setCrmPanelMessage(
        `${response.message} (target=${response.data.targetDate}, 생성=${response.data.createdCount}, 중복=${response.data.duplicatedCount})`
      );
      await loadCrmHistory();
    } catch (error) {
      setCrmPanelError(errorMessage(error));
    } finally {
      setCrmTriggerSubmitting(false);
    }
  }

  async function processCrmQueue() {
    setCrmProcessSubmitting(true);
    setCrmPanelError(null);
    setCrmPanelMessage(null);
    try {
      const response = await apiPost<CrmProcessResponse>("/api/v1/crm/messages/process", { limit: 50 });
      setCrmPanelMessage(
        `${response.message} (picked=${response.data.pickedCount}, sent=${response.data.sentCount}, retry=${response.data.retryWaitCount}, dead=${response.data.deadCount})`
      );
      await loadCrmHistory();
    } catch (error) {
      setCrmPanelError(errorMessage(error));
    } finally {
      setCrmProcessSubmitting(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void loadMembers();
    void loadProducts();
    void loadTrainerOptions();
    void loadReservationSchedules();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || activeNavSection !== "reservations") {
      return;
    }
    void loadReservationTargets();
  }, [isAuthenticated, activeNavSection]);

  useEffect(() => {
    if (authUser?.roleCode === "ROLE_TRAINER") {
      setMemberTrainerFilter(String(authUser.userId));
      return;
    }
    setMemberTrainerFilter("");
  }, [authUser]);

  useEffect(() => {
    if (activeNavSection !== "members") {
      setMemberFormOpen(false);
    }
    if (activeNavSection !== "products") {
      setProductFormOpen(false);
    }
  }, [activeNavSection]);

  useReservationsWorkspaceLoader({
    enabled: isAuthenticated && activeNavSection === "reservations",
    selectedMemberId: selectedMember?.memberId ?? null,
    loadReservationsForMember,
    onError: (error) => setReservationPanelError(errorMessage(error))
  });

  useAccessWorkspaceLoader({
    enabled: isAuthenticated && activeNavSection === "access",
    selectedMemberId: accessSelectedMemberId,
    ensureMembersLoaded,
    reloadAccessData,
    onError: (error) => setAccessPanelError(errorMessage(error))
  });

  useLockerWorkspaceLoader({
    enabled: isAuthenticated && activeNavSection === "lockers",
    ensureMembersLoaded,
    loadLockerSlots: (shouldCommit) => loadLockerSlots(undefined, shouldCommit),
    loadLockerAssignments,
    onError: (error) => setLockerPanelError(errorMessage(error))
  });

  useSettlementWorkspaceLoader({
    enabled: isAuthenticated && activeNavSection === "settlements",
    load: (shouldCommit) => loadSettlementReport(undefined, shouldCommit),
    onError: (error) => setSettlementPanelError(errorMessage(error))
  });

  useCrmWorkspaceLoader({
    enabled: isAuthenticated && activeNavSection === "crm",
    load: (shouldCommit) => loadCrmHistory(undefined, shouldCommit),
    onError: (error) => setCrmPanelError(errorMessage(error))
  });

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login(loginIdInput, loginPasswordInput);
  }

  async function handleLogout() {
    await logout();
  }

  async function handleMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMemberFormSubmitting(true);
    setMemberFormError(null);
    setMemberFormMessage(null);
    try {
      if (memberFormMode === "create") {
        const response = await apiPost<MemberDetail>("/api/v1/members", buildMemberPayload(memberForm));
        setMemberFormMessage(response.message);
        setMemberPanelMessage(response.message);
        invalidateWorkspaceMemberSearchCache();
        await loadMembers();
        await loadMemberDetail(response.data.memberId);
        setMemberFormOpen(false);
      } else if (selectedMemberId != null) {
        const response = await apiPatch<MemberDetail>(
          `/api/v1/members/${selectedMemberId}`,
          buildMemberPayload(memberForm)
        );
        setMemberFormMessage(response.message);
        setMemberPanelMessage(response.message);
        invalidateWorkspaceMemberSearchCache();
        await loadMembers();
        setSelectedMember(response.data);
        setMemberForm(memberFormFromDetail(response.data));
        setMemberFormOpen(false);
      }
    } catch (error) {
      setMemberFormError(errorMessage(error));
    } finally {
      setMemberFormSubmitting(false);
    }
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateProductForm(productForm);
    if (validationMessage) {
      setProductFormError(validationMessage);
      return;
    }

    setProductFormSubmitting(true);
    setProductFormError(null);
    setProductFormMessage(null);
    try {
      if (productFormMode === "create") {
        const response = await apiPost<ProductDetail>("/api/v1/products", buildProductPayload(productForm));
        setProductFormMessage(response.message);
        setProductPanelMessage(response.message);
        await loadProducts();
        await loadProductDetail(response.data.productId);
        setProductFormOpen(false);
      } else if (selectedProductId != null) {
        const response = await apiPatch<ProductDetail>(
          `/api/v1/products/${selectedProductId}`,
          buildProductPayload(productForm)
        );
        setProductFormMessage(response.message);
        setProductPanelMessage(response.message);
        await loadProducts();
        setSelectedProduct(response.data);
        setProductForm(productFormFromDetail(response.data));
        setProductFormOpen(false);
      }
    } catch (error) {
      setProductFormError(errorMessage(error));
    } finally {
      setProductFormSubmitting(false);
    }
  }

  async function handleProductStatusToggle() {
    if (!selectedProduct) {
      return;
    }
    setProductFormError(null);
    setProductFormMessage(null);
    setProductFormSubmitting(true);
    try {
      const nextStatus = selectedProduct.productStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const response = await apiPatch<ProductDetail>(`/api/v1/products/${selectedProduct.productId}/status`, {
        productStatus: nextStatus
      });
      setSelectedProduct(response.data);
      setProductForm(productFormFromDetail(response.data));
      setProductFormMessage(response.message);
      await loadProducts();
    } catch (error) {
      setProductFormError(errorMessage(error));
    } finally {
      setProductFormSubmitting(false);
    }
  }

  async function handleMembershipPurchaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) {
      setMemberPurchaseError("구매할 회원을 먼저 선택해주세요.");
      return;
    }
    if (!purchaseForm.productId) {
      setMemberPurchaseError("구매할 상품을 선택해주세요.");
      return;
    }
    if (!purchaseProductDetail) {
      setMemberPurchaseError("상품 상세 정보를 불러오는 중이거나 선택되지 않았습니다.");
      return;
    }
    if (purchasePreview && "error" in purchasePreview) {
      setMemberPurchaseError(purchasePreview.error ?? "구매 미리보기를 확인해주세요.");
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
    } catch (error) {
      setMemberPurchaseError(errorMessage(error));
    } finally {
      setMemberPurchaseSubmitting(false);
    }
  }

  function updateMembershipActionDraft(
    membershipId: number,
    updater: (draft: MembershipActionDraft) => MembershipActionDraft
  ) {
    setMembershipActionDrafts((prev) => {
      const current = prev[membershipId] ?? createDefaultMembershipActionDraft();
      const nextState = {
        ...prev,
        [membershipId]: updater(current)
      };
      return nextState;
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
        [memberId]: currentRows.map((row) => (row.membershipId === updatedMembership.membershipId ? updatedMembership : row))
      };
    });
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
        `/api/v1/members/${selectedMember.memberId}/memberships/${membership.membershipId}/hold`,
        {
          holdStartDate: draft.holdStartDate || null,
          holdEndDate: draft.holdEndDate || null,
          reason: normalizeOptionalText(draft.holdReason),
          memo: normalizeOptionalText(draft.holdMemo)
        }
      );

      patchSessionMembership(selectedMember.memberId, response.data.membership);
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
    } catch (error) {
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: errorMessage(error) }));
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
        `/api/v1/members/${selectedMember.memberId}/memberships/${membership.membershipId}/resume`,
        {
          resumeDate: draft.resumeDate || null
        }
      );

      patchSessionMembership(selectedMember.memberId, response.data.membership);
      setMembershipActionMessageById((prev) => ({ ...prev, [membership.membershipId]: response.message }));
    } catch (error) {
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: errorMessage(error) }));
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
        `/api/v1/members/${selectedMember.memberId}/memberships/${membership.membershipId}/refund/preview`,
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
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: errorMessage(error) }));
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
        `/api/v1/members/${selectedMember.memberId}/memberships/${membership.membershipId}/refund`,
        {
          refundDate: draft.refundDate || null,
          refundPaymentMethod: draft.refundPaymentMethod,
          refundReason: normalizeOptionalText(draft.refundReason),
          refundMemo: normalizeOptionalText(draft.refundMemo),
          paymentMemo: normalizeOptionalText(draft.refundPaymentMemo)
        }
      );

      patchSessionMembership(selectedMember.memberId, response.data.membership);
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
    } catch (error) {
      setMembershipActionErrorById((prev) => ({ ...prev, [membership.membershipId]: errorMessage(error) }));
    } finally {
      setMembershipActionSubmittingId(null);
    }
  }

  async function handleReservationCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) {
      setReservationPanelError("예약 대상 회원을 먼저 선택해주세요.");
      return;
    }
    if (!reservationCreateForm.membershipId) {
      setReservationPanelError("예약에 사용할 회원권을 선택해주세요.");
      return;
    }
    if (!reservationCreateForm.scheduleId) {
      setReservationPanelError("예약할 스케줄을 선택해주세요.");
      return;
    }

    setReservationCreateSubmitting(true);
    setReservationPanelError(null);
    setReservationPanelMessage(null);
    try {
      const response = await apiPost<ReservationRecord>("/api/v1/reservations", {
        memberId: selectedMember.memberId,
        membershipId: Number.parseInt(reservationCreateForm.membershipId, 10),
        scheduleId: Number.parseInt(reservationCreateForm.scheduleId, 10),
        memo: normalizeOptionalText(reservationCreateForm.memo)
      });
      setReservationPanelMessage(response.message);
      await loadReservationsForMember(selectedMember.memberId);
      await loadReservationSchedules();
      setReservationCreateForm({ ...EMPTY_RESERVATION_CREATE_FORM });
    } catch (error) {
      setReservationPanelError(errorMessage(error));
    } finally {
      setReservationCreateSubmitting(false);
    }
  }

  async function handleReservationCancel(reservationId: number) {
    if (!selectedMember) {
      return;
    }
    setReservationActionSubmittingId(reservationId);
    setReservationPanelError(null);
    setReservationPanelMessage(null);
    try {
      const response = await apiPost<ReservationRecord>(`/api/v1/reservations/${reservationId}/cancel`, {
        cancelReason: "관리자 포털 취소"
      });
      setReservationPanelMessage(response.message);
      await loadReservationsForMember(selectedMember.memberId);
      await loadReservationSchedules();
    } catch (error) {
      setReservationPanelError(errorMessage(error));
    } finally {
      setReservationActionSubmittingId(null);
    }
  }

  async function handleReservationComplete(reservationId: number) {
    if (!selectedMember) {
      return;
    }
    setReservationActionSubmittingId(reservationId);
    setReservationPanelError(null);
    setReservationPanelMessage(null);
    try {
      const response = await apiPost<ReservationCompleteResponse>(`/api/v1/reservations/${reservationId}/complete`);
      setReservationPanelMessage(
        response.data.countDeducted
          ? `${response.message} (잔여횟수: ${response.data.remainingCount ?? "-"})`
          : response.message
      );
      await loadReservationsForMember(selectedMember.memberId);
      await loadReservationSchedules();
      if (selectedMember) {
        // Keep membership workspace cache aligned for status/remaining count display in the same session.
        await loadMemberDetail(selectedMember.memberId, { syncForm: false });
      }
    } catch (error) {
      setReservationPanelError(errorMessage(error));
    } finally {
      setReservationActionSubmittingId(null);
    }
  }

  async function handleReservationCheckIn(reservationId: number) {
    if (!selectedMember) {
      return;
    }
    setReservationActionSubmittingId(reservationId);
    setReservationPanelError(null);
    setReservationPanelMessage(null);
    try {
      const response = await apiPost<ReservationRecord>(`/api/v1/reservations/${reservationId}/check-in`);
      setReservationPanelMessage(response.message);
      await loadReservationsForMember(selectedMember.memberId);
    } catch (error) {
      setReservationPanelError(errorMessage(error));
    } finally {
      setReservationActionSubmittingId(null);
    }
  }

  async function handleReservationNoShow(reservationId: number) {
    if (!selectedMember) {
      return;
    }
    setReservationActionSubmittingId(reservationId);
    setReservationPanelError(null);
    setReservationPanelMessage(null);
    try {
      const response = await apiPost<ReservationRecord>(`/api/v1/reservations/${reservationId}/no-show`);
      setReservationPanelMessage(response.message);
      await loadReservationsForMember(selectedMember.memberId);
      await loadReservationSchedules();
    } catch (error) {
      setReservationPanelError(errorMessage(error));
    } finally {
      setReservationActionSubmittingId(null);
    }
  }

  async function handleAccessEntry(memberId: number) {
    setAccessActionSubmitting(true);
    setAccessPanelError(null);
    setAccessPanelMessage(null);
    try {
      const response = await apiPost<AccessEventRecord>("/api/v1/access/entry", { memberId });
      setAccessPanelMessage(response.message);
      await reloadAccessData(memberId);
    } catch (error) {
      setAccessPanelError(errorMessage(error));
      await reloadAccessData(memberId);
    } finally {
      setAccessActionSubmitting(false);
    }
  }

  async function handleAccessExit(memberId: number) {
    setAccessActionSubmitting(true);
    setAccessPanelError(null);
    setAccessPanelMessage(null);
    try {
      const response = await apiPost<AccessEventRecord>("/api/v1/access/exit", { memberId });
      setAccessPanelMessage(response.message);
      await reloadAccessData(memberId);
    } catch (error) {
      setAccessPanelError(errorMessage(error));
    } finally {
      setAccessActionSubmitting(false);
    }
  }

  async function handleLockerAssignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lockerAssignForm.lockerSlotId) {
      setLockerPanelError("배정할 라커 슬롯을 선택해주세요.");
      return;
    }
    if (!lockerAssignForm.memberId) {
      setLockerPanelError("배정할 회원을 선택해주세요.");
      return;
    }
    if (!lockerAssignForm.startDate || !lockerAssignForm.endDate) {
      setLockerPanelError("시작일과 종료일을 입력해주세요.");
      return;
    }

    setLockerAssignSubmitting(true);
    setLockerPanelMessage(null);
    setLockerPanelError(null);
    try {
      const response = await apiPost<LockerAssignment>("/api/v1/lockers/assignments", {
        lockerSlotId: Number.parseInt(lockerAssignForm.lockerSlotId, 10),
        memberId: Number.parseInt(lockerAssignForm.memberId, 10),
        startDate: lockerAssignForm.startDate,
        endDate: lockerAssignForm.endDate,
        memo: normalizeOptionalText(lockerAssignForm.memo)
      });
      setLockerPanelMessage(response.message);
      setLockerAssignForm(createEmptyLockerAssignForm());
      await Promise.all([loadLockerSlots(), loadLockerAssignments(false)]);
    } catch (error) {
      setLockerPanelError(errorMessage(error));
    } finally {
      setLockerAssignSubmitting(false);
    }
  }

  async function handleLockerReturn(lockerAssignmentId: number) {
    setLockerReturnSubmittingId(lockerAssignmentId);
    setLockerPanelMessage(null);
    setLockerPanelError(null);
    try {
      const response = await apiPost<LockerAssignment>(`/api/v1/lockers/assignments/${lockerAssignmentId}/return`, {
        returnReason: "관리자 포털 반납 처리"
      });
      setLockerPanelMessage(response.message);
      await Promise.all([loadLockerSlots(), loadLockerAssignments(false)]);
    } catch (error) {
      setLockerPanelError(errorMessage(error));
    } finally {
      setLockerReturnSubmittingId(null);
    }
  }

  function startCreateMember() {
    setMemberFormMode("create");
    setSelectedMemberId(null);
    setSelectedMember(null);
    setMemberForm({ ...EMPTY_MEMBER_FORM, joinDate: new Date().toISOString().slice(0, 10) });
    setMemberPanelError(null);
    setMemberPanelMessage(null);
    setMemberFormError(null);
    setMemberFormMessage("신규 회원 등록 모드입니다.");
    setMemberFormOpen(true);
  }

  function startCreateProduct() {
    setProductFormMode("create");
    setSelectedProductId(null);
    setSelectedProduct(null);
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductPanelError(null);
    setProductPanelMessage(null);
    setProductFormError(null);
    setProductFormMessage("신규 상품 등록 모드입니다.");
    setProductFormOpen(true);
  }

  async function openMemberEditor(memberId: number) {
    const loaded = await loadMemberDetail(memberId);
    if (loaded) {
      setMemberFormOpen(true);
    }
  }

  async function selectMember(memberId: number) {
    await loadMemberDetail(memberId, { syncForm: false });
  }

  async function openMembershipOperationsForMember(memberId: number) {
    const loaded = await loadMemberDetail(memberId, { syncForm: false });
    if (loaded) {
      setActiveNavSection("memberships");
    }
  }

  async function openReservationManagementForMember(memberId: number) {
    const loaded = await loadMemberDetail(memberId, { syncForm: false });
    if (loaded) {
      setActiveNavSection("reservations");
    }
  }

  async function openProductEditor(productId: number) {
    const loaded = await loadProductDetail(productId);
    if (loaded) {
      setProductFormOpen(true);
    }
  }

  function closeMemberForm() {
    setMemberFormOpen(false);
    setMemberFormError(null);
    setMemberFormMessage(null);
  }

  function closeProductForm() {
    setProductFormOpen(false);
    setProductFormError(null);
    setProductFormMessage(null);
  }

  function handleThemeToggle() {
    setThemePreference((prev) => {
      const current = prev === "system" ? detectSystemTheme() : prev;
      return current === "dark" ? "light" : "dark";
    });
  }

  const navItems: Array<{ key: NavSectionKey; label: string; description: string }> = [
    { key: "dashboard", label: "대시보드", description: "운영 요약 / 빠른 진입" },
    { key: "members", label: "회원 관리", description: "회원 목록 / 등록 / 수정" },
    { key: "memberships", label: "회원권 업무", description: "구매 / 홀딩 / 해제 / 환불" },
    { key: "reservations", label: "예약 관리", description: "예약 생성 / 취소 / 완료 / 차감" },
    { key: "access", label: "출입 관리", description: "입장 / 퇴장 / 거절 이력 / 현재 입장" },
    { key: "lockers", label: "라커 관리", description: "슬롯 조회 / 배정 / 반납" },
    { key: "crm", label: "CRM 메시지", description: "만료임박 트리거 / 큐 처리 / 이력" },
    { key: "settlements", label: "정산 리포트", description: "기간/상품/결제수단/순매출" },
    { key: "products", label: "상품 관리", description: "상품 목록 / 정책 / 상태" }
  ];
  const selectedMemberMemberships = selectedMember ? (memberMembershipsByMemberId[selectedMember.memberId] ?? []) : [];
  const selectedMemberPayments = selectedMember ? (memberPaymentsByMemberId[selectedMember.memberId] ?? []) : [];
  const selectedMemberReservations = selectedMember ? (reservationRowsByMemberId[selectedMember.memberId] ?? []) : [];
  const reservationBusinessDateText = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const reservableMemberships = selectedMemberMemberships.filter(
    (membership) => isMembershipReservableOn(membership, reservationBusinessDateText)
  );
  const isDeskRole = authUser?.roleCode === "ROLE_DESK";
  const canManageProducts = !isJwtMode || authUser?.roleCode === "ROLE_CENTER_ADMIN";
  const appSubtitle = isJwtMode ? "Admin Portal · Phase 9 Access Ops" : "Admin Portal Prototype · Phase 9";
  const modeBadgeText = isJwtMode
    ? authUser
      ? `JWT Mode · ${authUser.roleCode} · ${authUser.displayName}`
      : "JWT Mode · 로그인 필요"
    : prototypeNoAuth
      ? "Prototype Mode (No Auth)"
      : "Prototype Mode";

  if (authBootstrapping) {
    return <BootstrappingScreen />;
  }

  if (isJwtMode && !isAuthenticated) {
    return (
      <LoginScreen
        subtitle={appSubtitle}
        modeBadgeText={modeBadgeText}
        authStatusMessage={authStatusMessage}
        authError={authError}
        loginIdInput={loginIdInput}
        loginPasswordInput={loginPasswordInput}
        loginSubmitting={loginSubmitting}
        onLoginIdChange={setLoginIdInput}
        onLoginPasswordChange={setLoginPasswordInput}
        onSubmit={handleLoginSubmit}
      />
    );
  }

  if (securityMode === "unknown") {
    return <UnknownSecurityScreen authError={authError} onReload={() => window.location.reload()} />;
  }

  return (
    <main className="app-shell">
      <TopBar
        subtitle={appSubtitle}
        modeBadgeText={modeBadgeText}
        authStatusMessage={authStatusMessage}
        resolvedTheme={resolvedTheme}
        onThemeToggle={handleThemeToggle}
        showLogout={Boolean(isJwtMode && authUser)}
        onLogout={() => void handleLogout()}
      />

      <section className="hero-card">
        <div>
          <h2>회원 / 상품 / 회원권 핵심 업무 데모</h2>
          <p>
            관리자 포털 단일 화면에서 회원/상품 CRUD와 회원권 구매/홀딩/해제/환불을 수행할 수 있습니다.
            {isJwtMode ? " 현재는 JWT 로그인 기반 세션으로 동작합니다." : " 현재는 프로토타입(no-auth) 모드입니다."}
          </p>
        </div>
        <ul className="inline-route-list" aria-label="prototype routes">
          {routePreview.map((route) => (
            <li key={route.path}>
              <code>{route.path}</code>
              <span>{route.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="portal-layout">
        <SidebarNav
          items={navItems}
          activeKey={activeNavSection}
          onSelect={(key) => setActiveNavSection(key as NavSectionKey)}
          isJwtMode={isJwtMode}
          selectedMemberLabel={selectedMember ? `#${selectedMember.memberId} ${selectedMember.memberName}` : "-"}
          currentUserLabel={authUser ? `${authUser.displayName} (${authUser.roleCode})` : "로그인 없음"}
        />

        <section className="portal-content" aria-label="관리자 포털 콘텐츠">
          <ContentHeader
            title={navItems.find((item) => item.key === activeNavSection)?.label ?? "관리자 포털"}
            description={
              activeNavSection === "dashboard"
                ? "핵심 업무 흐름과 현재 세션 상태를 요약해 확인합니다."
                : activeNavSection === "members"
                  ? "회원 목록/등록/수정과 회원 기본 상세를 관리합니다."
                  : activeNavSection === "memberships"
                    ? "선택한 회원 기준으로 회원권 업무 상태를 확인하고 회원권 처리 흐름으로 이동합니다."
                    : activeNavSection === "reservations"
                      ? "선택한 회원 기준으로 예약 생성/취소/완료와 차감 흐름을 처리합니다."
                      : activeNavSection === "access"
                        ? "회원 검색 기반으로 입장/퇴장과 출입 이벤트를 운영합니다."
                        : activeNavSection === "lockers"
                          ? "라커 슬롯 조회와 배정/반납 흐름을 처리합니다."
                          : activeNavSection === "crm"
                            ? "만료임박 이벤트 트리거와 메시지 큐 처리/이력 확인을 운영합니다."
                          : activeNavSection === "settlements"
                            ? "기간/상품/결제수단 기준 정산 집계와 순매출을 확인합니다."
                          : "상품 목록/정책/상태를 관리합니다."
            }
            showSelectMemberAction={
              (activeNavSection === "memberships" || activeNavSection === "reservations") && !selectedMember
            }
            onSelectMemberClick={() => setActiveNavSection("members")}
          />

          {activeNavSection === "dashboard" ? (
            <DashboardSection
              routePreview={routePreview}
              selectedMemberLabel={selectedMember ? `#${selectedMember.memberId} ${selectedMember.memberName}` : "-"}
              hasSelectedMember={Boolean(selectedMember)}
              isDeskRole={Boolean(isDeskRole)}
              securityMode={securityMode}
              isAuthenticated={isAuthenticated}
              membersCount={members.length}
              productsCount={products.length}
              sessionMembershipCount={selectedMemberMemberships.length}
              onOpenMembers={() => setActiveNavSection("members")}
              onOpenMemberships={() => setActiveNavSection("memberships")}
              onOpenReservations={() => setActiveNavSection("reservations")}
              onOpenAccess={() => setActiveNavSection("access")}
              onOpenProducts={() => setActiveNavSection("products")}
            />
          ) : activeNavSection === "memberships" ? (
            <MembershipsSection
              selectedMember={selectedMember}
              loadWorkspaceMembers={loadWorkspaceMembers}
              onSelectWorkspaceMember={(memberId) => loadMemberDetail(memberId, { syncForm: false })}
              onGoMembers={() => setActiveNavSection("members")}
            >
              <Suspense fallback={<WorkspacePanelFallback />}>
                <LazyMembershipOperationsPanels
                  key={selectedMember?.memberId ?? "membership-empty"}
                  selectedMember={selectedMember}
                  activeProductsForPurchase={activeProductsForPurchase}
                  purchaseForm={purchaseForm}
                  setPurchaseForm={setPurchaseForm}
                  setPurchaseProductDetail={setPurchaseProductDetail}
                  loadPurchaseProductDetail={loadPurchaseProductDetail}
                  purchaseProductLoading={purchaseProductLoading}
                  purchaseProductDetail={purchaseProductDetail}
                  purchasePreview={purchasePreview}
                  handleMembershipPurchaseSubmit={handleMembershipPurchaseSubmit}
                  memberPurchaseSubmitting={memberPurchaseSubmitting}
                  memberPurchaseMessage={memberPurchaseMessage}
                  memberPurchaseError={memberPurchaseError}
                  selectedMemberMemberships={selectedMemberMemberships}
                  selectedMemberPayments={selectedMemberPayments}
                  getMembershipActionDraft={getMembershipActionDraft}
                  buildHoldPreview={buildHoldPreview}
                  buildResumePreview={buildResumePreview}
                  membershipRefundPreviewById={membershipRefundPreviewById}
                  membershipActionMessageById={membershipActionMessageById}
                  membershipActionErrorById={membershipActionErrorById}
                  membershipActionSubmittingId={membershipActionSubmittingId}
                  membershipRefundPreviewLoadingId={membershipRefundPreviewLoadingId}
                  updateMembershipActionDraft={updateMembershipActionDraft}
                  handleMembershipHoldSubmit={handleMembershipHoldSubmit}
                  handleMembershipResumeSubmit={handleMembershipResumeSubmit}
                  handleMembershipRefundPreview={handleMembershipRefundPreview}
                  handleMembershipRefundSubmit={handleMembershipRefundSubmit}
                />
              </Suspense>
            </MembershipsSection>
          ) : activeNavSection === "reservations" ? (
            <ReservationsSection
              selectedMember={
                selectedMember
                  ? {
                      memberId: selectedMember.memberId,
                      memberName: selectedMember.memberName,
                      phone: selectedMember.phone,
                      memberStatus: selectedMember.memberStatus,
                      membershipExpiryDate:
                        reservationTargets.find((target) => target.memberId === selectedMember.memberId)?.membershipExpiryDate ?? null
                    }
                  : null
              }
              reservationTargets={reservationTargets}
              reservationTargetsLoading={reservationTargetsLoading}
              reservationTargetsKeyword={reservationTargetsKeyword}
              onReservationTargetsKeywordChange={setReservationTargetsKeyword}
              onReservationTargetsSearch={() => void loadReservationTargets()}
              onSelectReservationTarget={(memberId) => {
                void loadMemberDetail(memberId, { syncForm: false });
              }}
              selectedMemberReservationsCount={selectedMemberReservations.length}
              reservableMembershipsCount={reservableMemberships.length}
              reservableMemberships={reservableMemberships}
              selectedMemberReservations={selectedMemberReservations}
              reservationPanelMessage={reservationPanelMessage}
              reservationPanelError={effectiveReservationPanelError}
              onGoMembers={() => setActiveNavSection("members")}
            >
              <Suspense fallback={<WorkspacePanelFallback />}>
                <LazyReservationManagementPanels
                  key={selectedMember?.memberId ?? "reservation-empty"}
                  reservationSchedulesLoading={reservationSchedulesLoading}
                  handleReservationCreateSubmit={handleReservationCreateSubmit}
                  reservationCreateForm={reservationCreateForm}
                  setReservationCreateForm={setReservationCreateForm}
                  reservableMemberships={reservableMemberships}
                  reservationSchedules={reservationSchedules}
                  reservationCreateSubmitting={reservationCreateSubmitting}
                  loadReservationSchedules={loadReservationSchedules}
                  selectedMemberId={selectedMember?.memberId ?? null}
                  loadReservationsForMember={loadReservationsForMember}
                  reservationLoading={reservationLoading}
                  selectedMemberReservations={selectedMemberReservations}
                  reservationActionSubmittingId={reservationActionSubmittingId}
                  handleReservationCheckIn={handleReservationCheckIn}
                  handleReservationComplete={handleReservationComplete}
                  handleReservationCancel={handleReservationCancel}
                  handleReservationNoShow={handleReservationNoShow}
                />
              </Suspense>
            </ReservationsSection>
          ) : activeNavSection === "access" ? (
            <AccessSection accessPanelMessage={accessPanelMessage} accessPanelError={effectiveAccessPanelError}>
              <Suspense fallback={<WorkspacePanelFallback />}>
                <LazyAccessManagementPanels
                  members={members}
                  accessMemberQuery={accessMemberQuery}
                  setAccessMemberQuery={setAccessMemberQuery}
                  accessSelectedMemberId={accessSelectedMemberId}
                  setAccessSelectedMemberId={setAccessSelectedMemberId}
                  accessPresence={accessPresence}
                  accessEvents={accessEvents}
                  accessPresenceLoading={accessPresenceLoading}
                  accessEventsLoading={accessEventsLoading}
                  accessActionSubmitting={accessActionSubmitting}
                  handleAccessEntry={handleAccessEntry}
                  handleAccessExit={handleAccessExit}
                  reloadAccessData={reloadAccessData}
                />
              </Suspense>
            </AccessSection>
          ) : activeNavSection === "lockers" ? (
            <LockersSection>
              <Suspense fallback={<WorkspacePanelFallback />}>
                <LazyLockerManagementPanels
                  lockerFilters={lockerFilters}
                  setLockerFilters={setLockerFilters}
                  loadLockerSlots={loadLockerSlots}
                  lockerSlotsLoading={lockerSlotsLoading}
                  lockerSlots={lockerSlots}
                  lockerAssignmentsLoading={lockerAssignmentsLoading}
                  lockerAssignments={lockerAssignments}
                  lockerAssignForm={lockerAssignForm}
                  setLockerAssignForm={setLockerAssignForm}
                  handleLockerAssignSubmit={handleLockerAssignSubmit}
                  lockerAssignSubmitting={lockerAssignSubmitting}
                  lockerReturnSubmittingId={lockerReturnSubmittingId}
                  handleLockerReturn={handleLockerReturn}
                  lockerPanelMessage={lockerPanelMessage}
                  lockerPanelError={effectiveLockerPanelError}
                  members={members}
                />
              </Suspense>
            </LockersSection>
          ) : activeNavSection === "settlements" ? (
            <SettlementsSection>
              <Suspense fallback={<WorkspacePanelFallback />}>
                <LazySettlementReportPanels
                  settlementFilters={settlementFilters}
                  setSettlementFilters={setSettlementFilters}
                  loadSettlementReport={loadSettlementReport}
                  settlementReportLoading={settlementReportLoading}
                  settlementReport={settlementReport}
                  settlementPanelMessage={effectiveSettlementPanelMessage}
                  settlementPanelError={effectiveSettlementPanelError}
                />
              </Suspense>
            </SettlementsSection>
          ) : activeNavSection === "crm" ? (
            <CrmSection>
              <Suspense fallback={<WorkspacePanelFallback />}>
                <LazyCrmMessagePanels
                  crmHistoryRows={crmHistoryRows}
                  crmHistoryLoading={crmHistoryLoading}
                  crmFilters={crmFilters}
                  setCrmFilters={setCrmFilters}
                  crmTriggerDaysAhead={crmTriggerDaysAhead}
                  setCrmTriggerDaysAhead={setCrmTriggerDaysAhead}
                  crmTriggerSubmitting={crmTriggerSubmitting}
                  crmProcessSubmitting={crmProcessSubmitting}
                  crmPanelMessage={crmPanelMessage}
                  crmPanelError={effectiveCrmPanelError}
                  loadCrmHistory={loadCrmHistory}
                  triggerCrmExpiryReminder={triggerCrmExpiryReminder}
                  processCrmQueue={processCrmQueue}
                />
              </Suspense>
            </CrmSection>
          ) : activeNavSection === "members" ? (
        <MembersSection>
          <MemberManagementPanels
            startCreateMember={startCreateMember}
            memberSearchName={memberSearchName}
            setMemberSearchName={setMemberSearchName}
            memberSearchPhone={memberSearchPhone}
            setMemberSearchPhone={setMemberSearchPhone}
            memberTrainerFilter={memberTrainerFilter}
            setMemberTrainerFilter={setMemberTrainerFilter}
            memberProductFilter={memberProductFilter}
            setMemberProductFilter={setMemberProductFilter}
            memberDateFilter={memberDateFilter}
            applyMemberDatePreset={applyMemberDatePreset}
            setMemberDateFrom={setMemberDateFrom}
            setMemberDateTo={setMemberDateTo}
            trainerOptions={memberTrainerOptions}
            productOptions={products}
            trainerFilterDisabled={authUser?.roleCode === "ROLE_TRAINER"}
            loadMembers={loadMembers}
            membersLoading={membersLoading}
            memberPanelMessage={memberPanelMessage}
            memberPanelError={effectiveMemberPanelError}
            members={members}
            selectedMemberId={selectedMemberId}
            selectMember={selectMember}
            openMemberEditor={openMemberEditor}
            openMembershipOperationsForMember={openMembershipOperationsForMember}
            openReservationManagementForMember={openReservationManagementForMember}
            memberFormMode={memberFormMode}
            memberFormOpen={memberFormOpen}
            closeMemberForm={closeMemberForm}
            handleMemberSubmit={handleMemberSubmit}
            memberFormMessage={memberFormMessage}
            memberFormError={memberFormError}
            memberForm={memberForm}
            setMemberForm={setMemberForm}
            memberFormSubmitting={memberFormSubmitting}
          />
        </MembersSection>
      ) : activeNavSection === "products" ? (
        <ProductsSection>
          <Suspense fallback={<WorkspacePanelFallback />}>
            <LazyProductManagementPanels
              canManageProducts={canManageProducts}
              startCreateProduct={startCreateProduct}
              productFilters={productFilters}
              setProductFilters={setProductFilters}
              loadProducts={loadProducts}
              productsLoading={productsLoading}
              productPanelMessage={productPanelMessage}
              productPanelError={effectiveProductPanelError}
              products={products}
              selectedProductId={selectedProductId}
              openProductEditor={openProductEditor}
              productFormMode={productFormMode}
              productFormOpen={productFormOpen}
              closeProductForm={closeProductForm}
              selectedProduct={selectedProduct}
              handleProductStatusToggle={handleProductStatusToggle}
              productFormSubmitting={productFormSubmitting}
              handleProductSubmit={handleProductSubmit}
              productFormMessage={productFormMessage}
              productFormError={productFormError}
              productForm={productForm}
              setProductForm={setProductForm}
            />
          </Suspense>
        </ProductsSection>
      ) : null}
        </section>
      </div>
    </main>
  );
}
