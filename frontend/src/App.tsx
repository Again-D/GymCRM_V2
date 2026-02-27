import { FormEvent, useEffect, useMemo, useState } from "react";
import { routes } from "./app/routes";
import { ContentHeader } from "./components/layout/ContentHeader";
import { SidebarNav } from "./components/layout/SidebarNav";
import { TopBar } from "./components/layout/TopBar";
import { BootstrappingScreen } from "./features/auth/BootstrappingScreen";
import { LoginScreen } from "./features/auth/LoginScreen";
import { UnknownSecurityScreen } from "./features/auth/UnknownSecurityScreen";
import { AccessManagementPanels } from "./features/access/AccessManagementPanels";
import { AccessSection } from "./features/access/AccessSection";
import { DashboardSection } from "./features/dashboard/DashboardSection";
import { MemberManagementPanels } from "./features/members/MemberManagementPanels";
import { MembersSection } from "./features/members/MembersSection";
import { MembershipOperationsPanels } from "./features/memberships/MembershipOperationsPanels";
import { ProductManagementPanels } from "./features/products/ProductManagementPanels";
import { MembershipsSection } from "./features/memberships/MembershipsSection";
import { ProductsSection } from "./features/products/ProductsSection";
import { ReservationManagementPanels } from "./features/reservations/ReservationManagementPanels";
import { ReservationsSection } from "./features/reservations/ReservationsSection";
import { ApiClientError, apiGet, apiPatch, apiPost, configureApiAuth } from "./shared/api/client";
import { formatCurrency, formatDate, formatDateTime } from "./shared/utils/format";

type NavSectionKey = "dashboard" | "members" | "memberships" | "reservations" | "access" | "products";
type SecurityMode = "unknown" | "prototype" | "jwt";

type HealthPayload = {
  status: string;
  securityMode: string;
  prototypeNoAuth: boolean;
  currentUserId: number | null;
};

type AuthUserSession = {
  userId: number;
  centerId: number;
  loginId: string;
  displayName: string;
  roleCode: "ROLE_CENTER_ADMIN" | "ROLE_DESK";
};

type AuthTokenResponse = {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  accessTokenExpiresAt: string;
  user: AuthUserSession;
};

type MemberSummary = {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
};

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

type ProductSummary = {
  productId: number;
  centerId: number;
  productName: string;
  productCategory: "MEMBERSHIP" | "PT" | "GX" | "ETC" | null;
  productType: "DURATION" | "COUNT";
  priceAmount: number;
  productStatus: "ACTIVE" | "INACTIVE";
};

type ProductDetail = {
  productId: number;
  centerId: number;
  productName: string;
  productCategory: "MEMBERSHIP" | "PT" | "GX" | "ETC" | null;
  productType: "DURATION" | "COUNT";
  priceAmount: number;
  validityDays: number | null;
  totalCount: number | null;
  allowHold: boolean;
  maxHoldDays: number | null;
  maxHoldCount: number | null;
  allowTransfer: boolean;
  productStatus: "ACTIVE" | "INACTIVE";
  description: string | null;
};

type PurchasedMembership = {
  membershipId: number;
  centerId: number;
  memberId: number;
  productId: number;
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

type RefundCalculationApi = {
  refundDate: string;
  originalAmount: number;
  usedAmount: number;
  penaltyAmount: number;
  refundAmount: number;
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

type ProductFormState = {
  productName: string;
  productCategory: "" | "MEMBERSHIP" | "PT" | "GX" | "ETC";
  productType: "DURATION" | "COUNT";
  priceAmount: string;
  validityDays: string;
  totalCount: string;
  allowHold: boolean;
  maxHoldDays: string;
  maxHoldCount: string;
  allowTransfer: boolean;
  productStatus: "ACTIVE" | "INACTIVE";
  description: string;
};

type ProductFilters = {
  category: "" | "MEMBERSHIP" | "PT" | "GX" | "ETC";
  status: "" | "ACTIVE" | "INACTIVE";
};

type PurchaseFormState = {
  productId: string;
  startDate: string;
  paidAmount: string;
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "ETC";
  membershipMemo: string;
  paymentMemo: string;
};

type MembershipActionDraft = {
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

type ReservationScheduleSummary = {
  scheduleId: number;
  centerId: number;
  scheduleType: "PT" | "GX";
  trainerName: string;
  slotTitle: string;
  startAt: string;
  endAt: string;
  capacity: number;
  currentCount: number;
  memo: string | null;
};

type ReservationRecord = {
  reservationId: number;
  centerId: number;
  memberId: number;
  membershipId: number;
  scheduleId: number;
  reservationStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reservedAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  checkedInAt: string | null;
  cancelReason: string | null;
  memo: string | null;
};

type ReservationCompleteResponse = {
  reservation: ReservationRecord;
  membershipId: number;
  membershipStatus: string;
  remainingCount: number | null;
  usedCount: number;
  countDeducted: boolean;
};

type ReservationCreateFormState = {
  scheduleId: string;
  membershipId: string;
  memo: string;
};

type AccessEventRecord = {
  accessEventId: number;
  centerId: number;
  memberId: number;
  membershipId: number | null;
  reservationId: number | null;
  processedBy: number;
  eventType: "ENTRY_GRANTED" | "EXIT" | "ENTRY_DENIED";
  denyReason: string | null;
  processedAt: string;
};

type AccessOpenSession = {
  accessSessionId: number;
  memberId: number;
  memberName: string;
  phone: string;
  membershipId: number | null;
  reservationId: number | null;
  entryAt: string;
};

type AccessPresenceSummary = {
  openSessionCount: number;
  todayEntryGrantedCount: number;
  todayExitCount: number;
  todayEntryDeniedCount: number;
  openSessions: AccessOpenSession[];
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

const EMPTY_PRODUCT_FORM: ProductFormState = {
  productName: "",
  productCategory: "MEMBERSHIP",
  productType: "DURATION",
  priceAmount: "",
  validityDays: "30",
  totalCount: "",
  allowHold: true,
  maxHoldDays: "30",
  maxHoldCount: "1",
  allowTransfer: false,
  productStatus: "ACTIVE",
  description: ""
};

const EMPTY_PURCHASE_FORM: PurchaseFormState = {
  productId: "",
  startDate: new Date().toISOString().slice(0, 10),
  paidAmount: "",
  paymentMethod: "CASH",
  membershipMemo: "",
  paymentMemo: ""
};

const EMPTY_RESERVATION_CREATE_FORM: ReservationCreateFormState = {
  scheduleId: "",
  membershipId: "",
  memo: ""
};

function createDefaultMembershipActionDraft(): MembershipActionDraft {
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
  const [securityMode, setSecurityMode] = useState<SecurityMode>("unknown");
  const [prototypeNoAuth, setPrototypeNoAuth] = useState(false);
  const [authBootstrapping, setAuthBootstrapping] = useState(true);
  const [authAccessToken, setAuthAccessToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserSession | null>(null);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginIdInput, setLoginIdInput] = useState("center-admin");
  const [loginPasswordInput, setLoginPasswordInput] = useState("dev-admin-1234!");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [memberSearchName, setMemberSearchName] = useState("");
  const [memberSearchPhone, setMemberSearchPhone] = useState("");
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
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
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(EMPTY_PURCHASE_FORM);
  const [purchaseProductDetail, setPurchaseProductDetail] = useState<ProductDetail | null>(null);
  const [purchaseProductLoading, setPurchaseProductLoading] = useState(false);
  const [memberPurchaseSubmitting, setMemberPurchaseSubmitting] = useState(false);
  const [memberPurchaseMessage, setMemberPurchaseMessage] = useState<string | null>(null);
  const [memberPurchaseError, setMemberPurchaseError] = useState<string | null>(null);
  const [memberMembershipsByMemberId, setMemberMembershipsByMemberId] = useState<Record<number, PurchasedMembership[]>>({});
  const [memberPaymentsByMemberId, setMemberPaymentsByMemberId] = useState<Record<number, PurchasePayment[]>>({});
  const [membershipActionDrafts, setMembershipActionDrafts] = useState<Record<number, MembershipActionDraft>>({});
  const [membershipActionSubmittingId, setMembershipActionSubmittingId] = useState<number | null>(null);
  const [membershipActionMessageById, setMembershipActionMessageById] = useState<Record<number, string>>({});
  const [membershipActionErrorById, setMembershipActionErrorById] = useState<Record<number, string>>({});
  const [membershipRefundPreviewById, setMembershipRefundPreviewById] = useState<Record<number, RefundCalculationApi>>({});
  const [membershipRefundPreviewLoadingId, setMembershipRefundPreviewLoadingId] = useState<number | null>(null);
  const [reservationSchedules, setReservationSchedules] = useState<ReservationScheduleSummary[]>([]);
  const [reservationSchedulesLoading, setReservationSchedulesLoading] = useState(false);
  const [reservationRowsByMemberId, setReservationRowsByMemberId] = useState<Record<number, ReservationRecord[]>>({});
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationCreateForm, setReservationCreateForm] = useState<ReservationCreateFormState>(EMPTY_RESERVATION_CREATE_FORM);
  const [reservationCreateSubmitting, setReservationCreateSubmitting] = useState(false);
  const [reservationActionSubmittingId, setReservationActionSubmittingId] = useState<number | null>(null);
  const [reservationPanelMessage, setReservationPanelMessage] = useState<string | null>(null);
  const [reservationPanelError, setReservationPanelError] = useState<string | null>(null);
  const [accessMemberQuery, setAccessMemberQuery] = useState("");
  const [accessSelectedMemberId, setAccessSelectedMemberId] = useState<number | null>(null);
  const [accessEvents, setAccessEvents] = useState<AccessEventRecord[]>([]);
  const [accessPresence, setAccessPresence] = useState<AccessPresenceSummary | null>(null);
  const [accessEventsLoading, setAccessEventsLoading] = useState(false);
  const [accessPresenceLoading, setAccessPresenceLoading] = useState(false);
  const [accessActionSubmitting, setAccessActionSubmitting] = useState(false);
  const [accessPanelMessage, setAccessPanelMessage] = useState<string | null>(null);
  const [accessPanelError, setAccessPanelError] = useState<string | null>(null);

  const [productFilters, setProductFilters] = useState<ProductFilters>({ category: "", status: "" });
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [productFormMode, setProductFormMode] = useState<"create" | "edit">("create");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productFormSubmitting, setProductFormSubmitting] = useState(false);
  const [productPanelMessage, setProductPanelMessage] = useState<string | null>(null);
  const [productPanelError, setProductPanelError] = useState<string | null>(null);
  const [productFormMessage, setProductFormMessage] = useState<string | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  const routePreview = useMemo(() => routes.slice(0, 4), []);
  const isPrototypeMode = securityMode === "prototype";
  const isJwtMode = securityMode === "jwt";
  const isAuthenticated = isPrototypeMode || (isJwtMode && authUser != null && authAccessToken != null);
  const activeProductsForPurchase = useMemo(
    () => products.filter((product) => product.productStatus === "ACTIVE"),
    [products]
  );
  const purchasePreview = useMemo(
    () => buildPurchasePreview(purchaseProductDetail, purchaseForm),
    [purchaseProductDetail, purchaseForm]
  );

  function clearProtectedUiState() {
    setMembers([]);
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
    setPurchaseForm({ ...EMPTY_PURCHASE_FORM, startDate: new Date().toISOString().slice(0, 10) });
    setPurchaseProductDetail(null);
    setMemberPurchaseError(null);
    setMemberPurchaseMessage(null);
    setMemberMembershipsByMemberId({});
    setMemberPaymentsByMemberId({});
    setMembershipActionDrafts({});
    setMembershipActionMessageById({});
    setMembershipActionErrorById({});
    setMembershipRefundPreviewById({});
    setReservationSchedules([]);
    setReservationRowsByMemberId({});
    setReservationCreateForm({ ...EMPTY_RESERVATION_CREATE_FORM });
    setReservationPanelMessage(null);
    setReservationPanelError(null);
    setAccessMemberQuery("");
    setAccessSelectedMemberId(null);
    setAccessEvents([]);
    setAccessPresence(null);
    setAccessPanelMessage(null);
    setAccessPanelError(null);

    setProducts([]);
    setSelectedProductId(null);
    setSelectedProduct(null);
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductFormMode("create");
    setProductFormOpen(false);
    setProductPanelMessage(null);
    setProductPanelError(null);
    setProductFormMessage(null);
    setProductFormError(null);
    setProductFilters({ category: "", status: "" });
  }

  async function loadMembers(filters?: { name?: string; phone?: string }) {
    setMembersLoading(true);
    setMemberPanelError(null);
    try {
      const name = filters?.name ?? memberSearchName;
      const phone = filters?.phone ?? memberSearchPhone;
      const params = new URLSearchParams();
      if (name.trim()) {
        params.set("name", name.trim());
      }
      if (phone.trim()) {
        params.set("phone", phone.trim());
      }
      const query = params.toString();
      const response = await apiGet<MemberSummary[]>(`/api/v1/members${query ? `?${query}` : ""}`);
      setMembers(response.data);
    } catch (error) {
      setMemberPanelError(errorMessage(error));
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadMemberDetail(memberId: number, options?: { syncForm?: boolean }): Promise<boolean> {
    setSelectedMemberId(memberId);
    setMemberPanelError(null);
    setMemberPurchaseError(null);
    setMemberPurchaseMessage(null);
    setReservationPanelError(null);
    setReservationPanelMessage(null);
    setReservationActionSubmittingId(null);
    setReservationCreateForm({ ...EMPTY_RESERVATION_CREATE_FORM });
    setPurchaseForm({ ...EMPTY_PURCHASE_FORM, startDate: new Date().toISOString().slice(0, 10) });
    setPurchaseProductDetail(null);
    try {
      const response = await apiGet<MemberDetail>(`/api/v1/members/${memberId}`);
      setSelectedMember(response.data);
      if (options?.syncForm !== false) {
        setMemberForm(memberFormFromDetail(response.data));
        setMemberFormMode("edit");
      }
      return true;
    } catch (error) {
      setMemberPanelError(errorMessage(error));
      return false;
    }
  }

  async function loadProducts(filters?: ProductFilters) {
    setProductsLoading(true);
    setProductPanelError(null);
    try {
      const effectiveFilters = filters ?? productFilters;
      const params = new URLSearchParams();
      if (effectiveFilters.category) {
        params.set("category", effectiveFilters.category);
      }
      if (effectiveFilters.status) {
        params.set("status", effectiveFilters.status);
      }
      const query = params.toString();
      const response = await apiGet<ProductSummary[]>(`/api/v1/products${query ? `?${query}` : ""}`);
      setProducts(response.data);
    } catch (error) {
      setProductPanelError(errorMessage(error));
    } finally {
      setProductsLoading(false);
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

  async function loadReservationSchedules() {
    setReservationSchedulesLoading(true);
    setReservationPanelError(null);
    try {
      const response = await apiGet<ReservationScheduleSummary[]>("/api/v1/reservations/schedules");
      setReservationSchedules(response.data);
    } catch (error) {
      setReservationPanelError(errorMessage(error));
    } finally {
      setReservationSchedulesLoading(false);
    }
  }

  async function loadReservationsForMember(memberId: number) {
    setReservationLoading(true);
    setReservationPanelError(null);
    try {
      const response = await apiGet<ReservationRecord[]>(`/api/v1/reservations?memberId=${memberId}`);
      setReservationRowsByMemberId((prev) => ({
        ...prev,
        [memberId]: response.data
      }));
    } catch (error) {
      setReservationPanelError(errorMessage(error));
    } finally {
      setReservationLoading(false);
    }
  }

  async function loadAccessEvents(memberId?: number | null) {
    setAccessEventsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (memberId != null) {
        params.set("memberId", String(memberId));
      }
      const response = await apiGet<AccessEventRecord[]>(`/api/v1/access/events?${params.toString()}`);
      setAccessEvents(response.data);
    } finally {
      setAccessEventsLoading(false);
    }
  }

  async function loadAccessPresence() {
    setAccessPresenceLoading(true);
    try {
      const response = await apiGet<AccessPresenceSummary>("/api/v1/access/presence");
      setAccessPresence(response.data);
    } finally {
      setAccessPresenceLoading(false);
    }
  }

  async function reloadAccessData(memberId?: number | null) {
    setAccessPanelError(null);
    await Promise.all([loadAccessPresence(), loadAccessEvents(memberId)]);
  }

  useEffect(() => {
    if (!isJwtMode) {
      configureApiAuth(null);
      return;
    }
    configureApiAuth({
      getAccessToken: () => authAccessToken,
      refreshAccessToken: async () => {
        const response = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
        setAuthAccessToken(response.data.accessToken);
        setAuthUser(response.data.user);
        return response.data.accessToken;
      },
      onUnauthorized: () => {
        setAuthAccessToken(null);
        setAuthUser(null);
        setAuthStatusMessage("세션이 만료되어 다시 로그인해야 합니다.");
      }
    });
    return () => configureApiAuth(null);
  }, [isJwtMode, authAccessToken]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuthMode() {
      setAuthBootstrapping(true);
      setAuthError(null);
      try {
        const health = await apiGet<HealthPayload>("/api/v1/health");
        if (cancelled) {
          return;
        }
        const mode = health.data.securityMode === "jwt" ? "jwt" : "prototype";
        setSecurityMode(mode);
        setPrototypeNoAuth(Boolean(health.data.prototypeNoAuth));

        if (mode === "prototype") {
          setAuthAccessToken(null);
          setAuthUser(null);
          setAuthStatusMessage(null);
          return;
        }

        try {
          const refreshResponse = await apiPost<AuthTokenResponse>("/api/v1/auth/refresh");
          if (cancelled) {
            return;
          }
          setAuthAccessToken(refreshResponse.data.accessToken);
          setAuthUser(refreshResponse.data.user);
          setAuthStatusMessage("기존 세션을 복구했습니다.");
        } catch (refreshError) {
          if (cancelled) {
            return;
          }
          setAuthAccessToken(null);
          setAuthUser(null);
          if (!(refreshError instanceof ApiClientError && refreshError.status === 401)) {
            setAuthError(errorMessage(refreshError));
          }
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setSecurityMode("unknown");
        setAuthError(errorMessage(error));
      } finally {
        if (!cancelled) {
          setAuthBootstrapping(false);
        }
      }
    }

    void bootstrapAuthMode();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void loadMembers();
    void loadProducts();
    void loadReservationSchedules();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !selectedMember || activeNavSection !== "reservations") {
      return;
    }
    void loadReservationsForMember(selectedMember.memberId);
  }, [isAuthenticated, activeNavSection, selectedMember]);

  useEffect(() => {
    if (activeNavSection !== "members") {
      setMemberFormOpen(false);
    }
    if (activeNavSection !== "products") {
      setProductFormOpen(false);
    }
  }, [activeNavSection]);

  useEffect(() => {
    if (!isAuthenticated || activeNavSection !== "access") {
      return;
    }

    async function initializeAccessWorkspace() {
      if (members.length === 0) {
        await loadMembers();
      }
      await reloadAccessData(accessSelectedMemberId);
    }

    void initializeAccessWorkspace().catch((error) => {
      setAccessPanelError(errorMessage(error));
    });
  }, [isAuthenticated, activeNavSection, accessSelectedMemberId]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginSubmitting(true);
    setAuthError(null);
    setAuthStatusMessage(null);
    try {
      const response = await apiPost<AuthTokenResponse>("/api/v1/auth/login", {
        loginId: loginIdInput,
        password: loginPasswordInput
      });
      setAuthAccessToken(response.data.accessToken);
      setAuthUser(response.data.user);
      setAuthStatusMessage(response.message);
    } catch (error) {
      setAuthError(errorMessage(error));
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function handleLogout() {
    setAuthError(null);
    try {
      await apiPost<void>("/api/v1/auth/logout");
    } catch {
      // Logout is best-effort; clear local session even if request fails.
    } finally {
      setAuthAccessToken(null);
      setAuthUser(null);
      setAuthStatusMessage("로그아웃되었습니다.");
      clearProtectedUiState();
    }
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
      setPurchaseForm({ ...EMPTY_PURCHASE_FORM, startDate: new Date().toISOString().slice(0, 10) });
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

  const navItems: Array<{ key: NavSectionKey; label: string; description: string }> = [
    { key: "dashboard", label: "대시보드", description: "운영 요약 / 빠른 진입" },
    { key: "members", label: "회원 관리", description: "회원 목록 / 등록 / 수정" },
    { key: "memberships", label: "회원권 업무", description: "구매 / 홀딩 / 해제 / 환불" },
    { key: "reservations", label: "예약 관리", description: "예약 생성 / 취소 / 완료 / 차감" },
    { key: "access", label: "출입 관리", description: "입장 / 퇴장 / 거절 이력 / 현재 입장" },
    { key: "products", label: "상품 관리", description: "상품 목록 / 정책 / 상태" }
  ];
  const selectedMemberMemberships = selectedMember ? (memberMembershipsByMemberId[selectedMember.memberId] ?? []) : [];
  const selectedMemberPayments = selectedMember ? (memberPaymentsByMemberId[selectedMember.memberId] ?? []) : [];
  const selectedMemberReservations = selectedMember ? (reservationRowsByMemberId[selectedMember.memberId] ?? []) : [];
  const reservableMemberships = selectedMemberMemberships.filter(
    (membership) =>
      membership.membershipStatus === "ACTIVE" &&
      (membership.productTypeSnapshot !== "COUNT" || (membership.remainingCount ?? 0) > 0)
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
            <MembershipsSection selectedMember={selectedMember} onGoMembers={() => setActiveNavSection("members")}>
              <MembershipOperationsPanels
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
            </MembershipsSection>
          ) : activeNavSection === "reservations" ? (
            <ReservationsSection
              selectedMember={selectedMember ? { memberId: selectedMember.memberId, memberName: selectedMember.memberName } : null}
              selectedMemberReservationsCount={selectedMemberReservations.length}
              reservableMembershipsCount={reservableMemberships.length}
              reservationPanelMessage={reservationPanelMessage}
              reservationPanelError={reservationPanelError}
              onGoMembers={() => setActiveNavSection("members")}
            >
              <ReservationManagementPanels
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
            </ReservationsSection>
          ) : activeNavSection === "access" ? (
            <AccessSection accessPanelMessage={accessPanelMessage} accessPanelError={accessPanelError}>
              <AccessManagementPanels
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
            </AccessSection>
          ) : activeNavSection === "members" ? (
        <MembersSection>
          <MemberManagementPanels
            startCreateMember={startCreateMember}
            memberSearchName={memberSearchName}
            setMemberSearchName={setMemberSearchName}
            memberSearchPhone={memberSearchPhone}
            setMemberSearchPhone={setMemberSearchPhone}
            loadMembers={loadMembers}
            membersLoading={membersLoading}
            memberPanelMessage={memberPanelMessage}
            memberPanelError={memberPanelError}
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
          <ProductManagementPanels
            canManageProducts={canManageProducts}
            startCreateProduct={startCreateProduct}
            productFilters={productFilters}
            setProductFilters={setProductFilters}
            loadProducts={loadProducts}
            productsLoading={productsLoading}
            productPanelMessage={productPanelMessage}
            productPanelError={productPanelError}
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
        </ProductsSection>
      ) : null}
        </section>
      </div>
    </main>
  );
}
