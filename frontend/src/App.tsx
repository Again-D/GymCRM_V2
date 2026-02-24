import { FormEvent, useEffect, useMemo, useState } from "react";
import { routes } from "./app/routes";
import { ApiClientError, apiGet, apiPatch, apiPost, configureApiAuth } from "./shared/api/client";

type NavSectionKey = "dashboard" | "members" | "memberships" | "products";
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

function formatDate(dateText: string | null): string {
  if (!dateText) {
    return "-";
  }
  return dateText;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
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
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [memberFormMode, setMemberFormMode] = useState<"create" | "edit">("create");
  const [memberFormSubmitting, setMemberFormSubmitting] = useState(false);
  const [memberPanelMessage, setMemberPanelMessage] = useState<string | null>(null);
  const [memberPanelError, setMemberPanelError] = useState<string | null>(null);
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

  const [productFilters, setProductFilters] = useState<ProductFilters>({ category: "", status: "" });
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetail | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(EMPTY_PRODUCT_FORM);
  const [productFormMode, setProductFormMode] = useState<"create" | "edit">("create");
  const [productFormSubmitting, setProductFormSubmitting] = useState(false);
  const [productPanelMessage, setProductPanelMessage] = useState<string | null>(null);
  const [productPanelError, setProductPanelError] = useState<string | null>(null);

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
    setMemberPanelMessage(null);
    setMemberPanelError(null);
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

    setProducts([]);
    setSelectedProductId(null);
    setSelectedProduct(null);
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductFormMode("create");
    setProductPanelMessage(null);
    setProductPanelError(null);
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

  async function loadMemberDetail(memberId: number, options?: { syncForm?: boolean }) {
    setSelectedMemberId(memberId);
    setMemberDetailLoading(true);
    setMemberPanelError(null);
    setMemberPurchaseError(null);
    setMemberPurchaseMessage(null);
    setPurchaseForm({ ...EMPTY_PURCHASE_FORM, startDate: new Date().toISOString().slice(0, 10) });
    setPurchaseProductDetail(null);
    try {
      const response = await apiGet<MemberDetail>(`/api/v1/members/${memberId}`);
      setSelectedMember(response.data);
      if (options?.syncForm !== false) {
        setMemberForm(memberFormFromDetail(response.data));
        setMemberFormMode("edit");
      }
    } catch (error) {
      setMemberPanelError(errorMessage(error));
    } finally {
      setMemberDetailLoading(false);
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

  async function loadProductDetail(productId: number, options?: { syncForm?: boolean }) {
    setSelectedProductId(productId);
    setProductDetailLoading(true);
    setProductPanelError(null);
    try {
      const response = await apiGet<ProductDetail>(`/api/v1/products/${productId}`);
      setSelectedProduct(response.data);
      if (options?.syncForm !== false) {
        setProductForm(productFormFromDetail(response.data));
        setProductFormMode("edit");
      }
    } catch (error) {
      setProductPanelError(errorMessage(error));
    } finally {
      setProductDetailLoading(false);
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
  }, [isAuthenticated]);

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
    setMemberPanelError(null);
    setMemberPanelMessage(null);
    try {
      if (memberFormMode === "create") {
        const response = await apiPost<MemberDetail>("/api/v1/members", buildMemberPayload(memberForm));
        setMemberPanelMessage(response.message);
        await loadMembers();
        await loadMemberDetail(response.data.memberId);
      } else if (selectedMemberId != null) {
        const response = await apiPatch<MemberDetail>(
          `/api/v1/members/${selectedMemberId}`,
          buildMemberPayload(memberForm)
        );
        setMemberPanelMessage(response.message);
        await loadMembers();
        setSelectedMember(response.data);
        setMemberForm(memberFormFromDetail(response.data));
      }
    } catch (error) {
      setMemberPanelError(errorMessage(error));
    } finally {
      setMemberFormSubmitting(false);
    }
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateProductForm(productForm);
    if (validationMessage) {
      setProductPanelError(validationMessage);
      return;
    }

    setProductFormSubmitting(true);
    setProductPanelError(null);
    setProductPanelMessage(null);
    try {
      if (productFormMode === "create") {
        const response = await apiPost<ProductDetail>("/api/v1/products", buildProductPayload(productForm));
        setProductPanelMessage(response.message);
        await loadProducts();
        await loadProductDetail(response.data.productId);
      } else if (selectedProductId != null) {
        const response = await apiPatch<ProductDetail>(
          `/api/v1/products/${selectedProductId}`,
          buildProductPayload(productForm)
        );
        setProductPanelMessage(response.message);
        await loadProducts();
        setSelectedProduct(response.data);
        setProductForm(productFormFromDetail(response.data));
      }
    } catch (error) {
      setProductPanelError(errorMessage(error));
    } finally {
      setProductFormSubmitting(false);
    }
  }

  async function handleProductStatusToggle() {
    if (!selectedProduct) {
      return;
    }
    setProductPanelError(null);
    setProductPanelMessage(null);
    setProductFormSubmitting(true);
    try {
      const nextStatus = selectedProduct.productStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const response = await apiPatch<ProductDetail>(`/api/v1/products/${selectedProduct.productId}/status`, {
        productStatus: nextStatus
      });
      setSelectedProduct(response.data);
      setProductForm(productFormFromDetail(response.data));
      setProductPanelMessage(response.message);
      await loadProducts();
    } catch (error) {
      setProductPanelError(errorMessage(error));
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

  function startCreateMember() {
    setMemberFormMode("create");
    setSelectedMemberId(null);
    setSelectedMember(null);
    setMemberForm({ ...EMPTY_MEMBER_FORM, joinDate: new Date().toISOString().slice(0, 10) });
    setMemberPanelError(null);
    setMemberPanelMessage("신규 회원 등록 모드입니다.");
  }

  function startCreateProduct() {
    setProductFormMode("create");
    setSelectedProductId(null);
    setSelectedProduct(null);
    setProductForm({ ...EMPTY_PRODUCT_FORM });
    setProductPanelError(null);
    setProductPanelMessage("신규 상품 등록 모드입니다.");
  }

  function renderMembershipOperationsPanels() {
    if (!selectedMember) {
      return null;
    }

    return (
      <>
        <article className="panel">
          <div className="panel-header">
            <h3>회원권 구매</h3>
          </div>
          <p className="muted-text">선택 회원 기준으로 기간제/횟수제 상품 구매를 처리합니다.</p>

          <form className="form-grid membership-purchase-form" onSubmit={handleMembershipPurchaseSubmit}>
            <label>
              상품 선택 *
              <select
                value={purchaseForm.productId}
                onChange={(e) => {
                  const nextProductId = e.target.value;
                  setPurchaseForm((prev) => ({ ...prev, productId: nextProductId }));
                  if (!nextProductId) {
                    setPurchaseProductDetail(null);
                    return;
                  }
                  void loadPurchaseProductDetail(Number.parseInt(nextProductId, 10));
                }}
              >
                <option value="">선택하세요</option>
                {activeProductsForPurchase.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    #{product.productId} · {product.productName} ({product.productType}) · {formatCurrency(product.priceAmount)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              시작일
              <input
                type="date"
                value={purchaseForm.startDate}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </label>
            <label>
              결제수단
              <select
                value={purchaseForm.paymentMethod}
                onChange={(e) =>
                  setPurchaseForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value as PurchaseFormState["paymentMethod"]
                  }))
                }
              >
                <option value="CASH">CASH</option>
                <option value="CARD">CARD</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="ETC">ETC</option>
              </select>
            </label>
            <label>
              결제금액 (비우면 상품가)
              <input
                inputMode="decimal"
                value={purchaseForm.paidAmount}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, paidAmount: e.target.value }))}
              />
            </label>
            <label className="full-row">
              회원권 메모
              <textarea
                rows={2}
                value={purchaseForm.membershipMemo}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, membershipMemo: e.target.value }))}
              />
            </label>
            <label className="full-row">
              결제 메모
              <textarea
                rows={2}
                value={purchaseForm.paymentMemo}
                onChange={(e) => setPurchaseForm((prev) => ({ ...prev, paymentMemo: e.target.value }))}
              />
            </label>

            <div className="full-row preview-card">
              <strong>구매 계산 미리보기</strong>
              {purchaseProductLoading ? (
                <p className="muted-text">상품 정보를 불러오는 중...</p>
              ) : !purchaseProductDetail ? (
                <p className="muted-text">상품을 선택하면 미리보기를 표시합니다.</p>
              ) : purchasePreview && "error" in purchasePreview ? (
                <p className="notice error compact">{purchasePreview.error}</p>
              ) : purchasePreview ? (
                <dl className="purchase-preview-grid">
                  <div>
                    <dt>유형</dt>
                    <dd>{purchaseProductDetail.productType}</dd>
                  </div>
                  <div>
                    <dt>시작일</dt>
                    <dd>{purchasePreview.startDate}</dd>
                  </div>
                  <div>
                    <dt>만료일</dt>
                    <dd>{purchasePreview.endDate ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>총횟수</dt>
                    <dd>{purchasePreview.totalCount ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>잔여횟수</dt>
                    <dd>{purchasePreview.remainingCount ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>청구금액</dt>
                    <dd>{formatCurrency(purchasePreview.chargeAmount)}</dd>
                  </div>
                </dl>
              ) : null}
            </div>

            <div className="form-actions full-row">
              <button
                type="submit"
                className="primary-button"
                disabled={memberPurchaseSubmitting || !selectedMember || !purchaseForm.productId}
              >
                {memberPurchaseSubmitting ? "구매 처리 중..." : "회원권 구매 확정"}
              </button>
            </div>
          </form>

          {memberPurchaseMessage ? <p className="notice success compact">{memberPurchaseMessage}</p> : null}
          {memberPurchaseError ? <p className="notice error compact">{memberPurchaseError}</p> : null}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>회원권 목록 (이번 세션 생성분)</h3>
          </div>
          {selectedMemberMemberships.length === 0 ? (
            <div className="placeholder-card">
              <p>아직 이 세션에서 생성된 회원권이 없습니다.</p>
            </div>
          ) : (
            <div className="list-shell">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>상품</th>
                    <th>유형</th>
                    <th>상태</th>
                    <th>시작일</th>
                    <th>만료일</th>
                    <th>잔여횟수</th>
                    <th>액션 (홀딩/해제/환불)</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMemberMemberships.map((membership) => (
                    <tr key={membership.membershipId}>
                      <td>{membership.membershipId}</td>
                      <td>{membership.productNameSnapshot}</td>
                      <td>{membership.productTypeSnapshot}</td>
                      <td>{membership.membershipStatus}</td>
                      <td>{membership.startDate}</td>
                      <td>{membership.endDate ?? "-"}</td>
                      <td>{membership.remainingCount ?? "-"}</td>
                      <td>
                        {(() => {
                          const draft = getMembershipActionDraft(membership.membershipId);
                          const holdPreview = buildHoldPreview(membership, draft);
                          const resumePreview = buildResumePreview(membership, draft);
                          const refundPreview = membershipRefundPreviewById[membership.membershipId];
                          const actionMessage = membershipActionMessageById[membership.membershipId];
                          const actionError = membershipActionErrorById[membership.membershipId];
                          const isSubmitting = membershipActionSubmittingId === membership.membershipId;
                          const isRefundPreviewLoading = membershipRefundPreviewLoadingId === membership.membershipId;
                          const canRefund = membership.membershipStatus === "ACTIVE";
                          return (
                            <div className="membership-action-cell">
                              {membership.membershipStatus === "ACTIVE" ? (
                                <>
                                  <label>
                                    홀딩 시작일
                                    <input
                                      type="date"
                                      value={draft.holdStartDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdStartDate: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    홀딩 종료일
                                    <input
                                      type="date"
                                      value={draft.holdEndDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdEndDate: e.target.value,
                                          resumeDate: e.target.value || prev.resumeDate
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    사유(선택)
                                    <input
                                      value={draft.holdReason}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          holdReason: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="membership-action-preview">
                                    {holdPreview && "error" in holdPreview ? (
                                      <span className="notice error compact">{holdPreview.error}</span>
                                    ) : holdPreview ? (
                                      <span>
                                        홀딩 {holdPreview.plannedHoldDays}일 / 예상 해제 후 만료일:{" "}
                                        {holdPreview.recalculatedEndDate ?? "-"}
                                      </span>
                                    ) : (
                                      <span className="muted-text">홀딩 미리보기 없음</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={isSubmitting}
                                    onClick={() => void handleMembershipHoldSubmit(membership)}
                                  >
                                    {isSubmitting ? "처리 중..." : "홀딩"}
                                  </button>
                                </>
                              ) : membership.membershipStatus === "HOLDING" ? (
                                <>
                                  <label>
                                    해제일
                                    <input
                                      type="date"
                                      value={draft.resumeDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          resumeDate: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="membership-action-preview">
                                    {resumePreview && "error" in resumePreview ? (
                                      <span className="notice error compact">{resumePreview.error}</span>
                                    ) : resumePreview ? (
                                      <span>
                                        예상 홀딩일수: {resumePreview.actualHoldDays}일 / 해제 후 만료일:{" "}
                                        {resumePreview.recalculatedEndDate ?? "-"}
                                      </span>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={isSubmitting}
                                    onClick={() => void handleMembershipResumeSubmit(membership)}
                                  >
                                    {isSubmitting ? "처리 중..." : "홀딩 해제"}
                                  </button>
                                </>
                              ) : (
                                <span className="muted-text">상태상 액션 없음</span>
                              )}

                              <div className="membership-action-divider" aria-hidden="true" />

                              {canRefund ? (
                                <>
                                  <label>
                                    환불 기준일
                                    <input
                                      type="date"
                                      value={draft.refundDate}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundDate: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    환불 수단
                                    <select
                                      value={draft.refundPaymentMethod}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundPaymentMethod:
                                            e.target.value as MembershipActionDraft["refundPaymentMethod"]
                                        }))
                                      }
                                    >
                                      <option value="CASH">현금</option>
                                      <option value="CARD">카드</option>
                                      <option value="TRANSFER">이체</option>
                                      <option value="ETC">기타</option>
                                    </select>
                                  </label>
                                  <label>
                                    환불 사유(선택)
                                    <input
                                      value={draft.refundReason}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundReason: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    환불 메모(선택)
                                    <input
                                      value={draft.refundMemo}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundMemo: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    결제 메모(선택)
                                    <input
                                      value={draft.refundPaymentMemo}
                                      onChange={(e) =>
                                        updateMembershipActionDraft(membership.membershipId, (prev) => ({
                                          ...prev,
                                          refundPaymentMemo: e.target.value
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="membership-action-preview">
                                    {refundPreview ? (
                                      <div className="membership-preview-stack">
                                        <span>
                                          기준금액 {formatCurrency(refundPreview.originalAmount)} / 사용분{" "}
                                          {formatCurrency(refundPreview.usedAmount)}
                                        </span>
                                        <span>
                                          위약금 {formatCurrency(refundPreview.penaltyAmount)} / 환불액{" "}
                                          {formatCurrency(refundPreview.refundAmount)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="muted-text">환불 미리보기 없음</span>
                                    )}
                                  </div>
                                  <div className="membership-action-buttons">
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled={isSubmitting || isRefundPreviewLoading}
                                      onClick={() => void handleMembershipRefundPreview(membership)}
                                    >
                                      {isRefundPreviewLoading ? "계산 중..." : "환불 미리보기"}
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary-button"
                                      disabled={isSubmitting || isRefundPreviewLoading}
                                      onClick={() => void handleMembershipRefundSubmit(membership)}
                                    >
                                      {isSubmitting ? "처리 중..." : "환불 확정"}
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <p className="muted-text">
                                  {membership.membershipStatus === "HOLDING"
                                    ? "홀딩 상태 회원권은 먼저 해제 후 환불해주세요."
                                    : `환불 불가 상태입니다. 현재 상태: ${membership.membershipStatus}`}
                                </p>
                              )}

                              {actionMessage ? <p className="notice success compact">{actionMessage}</p> : null}
                              {actionError ? <p className="notice error compact">{actionError}</p> : null}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>결제 이력 (이번 세션 생성분)</h3>
          </div>
          {selectedMemberPayments.length === 0 ? (
            <div className="placeholder-card">
              <p>아직 이 세션에서 생성된 결제 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="list-shell">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>회원권ID</th>
                    <th>유형</th>
                    <th>상태</th>
                    <th>수단</th>
                    <th>금액</th>
                    <th>결제시각</th>
                    <th>메모</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedMemberPayments.map((payment) => (
                    <tr key={payment.paymentId}>
                      <td>{payment.paymentId}</td>
                      <td>{payment.membershipId}</td>
                      <td>{payment.paymentType}</td>
                      <td>{payment.paymentStatus}</td>
                      <td>{payment.paymentMethod}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{payment.paidAt}</td>
                      <td>{payment.memo ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </>
    );
  }

  const navItems: Array<{ key: NavSectionKey; label: string; description: string }> = [
    { key: "dashboard", label: "대시보드", description: "운영 요약 / 빠른 진입" },
    { key: "members", label: "회원 관리", description: "회원 목록 / 등록 / 수정" },
    { key: "memberships", label: "회원권 업무", description: "구매 / 홀딩 / 해제 / 환불" },
    { key: "products", label: "상품 관리", description: "상품 목록 / 정책 / 상태" }
  ];
  const selectedMemberMemberships = selectedMember ? (memberMembershipsByMemberId[selectedMember.memberId] ?? []) : [];
  const selectedMemberPayments = selectedMember ? (memberPaymentsByMemberId[selectedMember.memberId] ?? []) : [];
  const isDeskRole = authUser?.roleCode === "ROLE_DESK";
  const canManageProducts = !isJwtMode || authUser?.roleCode === "ROLE_CENTER_ADMIN";
  const appSubtitle = isJwtMode ? "Admin Portal · Phase 5 JWT/RBAC" : "Admin Portal Prototype · Phase 5";
  const modeBadgeText = isJwtMode
    ? authUser
      ? `JWT Mode · ${authUser.roleCode} · ${authUser.displayName}`
      : "JWT Mode · 로그인 필요"
    : prototypeNoAuth
      ? "Prototype Mode (No Auth)"
      : "Prototype Mode";

  if (authBootstrapping) {
    return (
      <main className="app-shell">
        <section className="hero-card auth-card" aria-live="polite">
          <div>
            <h2>초기 환경 확인 중</h2>
            <p>서버 보안 모드와 세션 상태를 확인하고 있습니다.</p>
          </div>
          <div className="auth-card-side">
            <div className="prototype-badge">Bootstrapping...</div>
          </div>
        </section>
      </main>
    );
  }

  if (isJwtMode && !isAuthenticated) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand">
            <h1>GYM CRM</h1>
            <p>{appSubtitle}</p>
          </div>
          <div className="prototype-badge" role="status" aria-live="polite">
            {modeBadgeText}
          </div>
        </header>

        <section className="hero-card auth-card" aria-label="관리자 로그인">
          <div>
            <h2>관리자 로그인</h2>
            <p>JWT 모드에서는 로그인 후에만 회원/상품/회원권 기능 화면에 접근할 수 있습니다.</p>
            {authStatusMessage ? <p className="notice success">{authStatusMessage}</p> : null}
            {authError ? <p className="notice error">{authError}</p> : null}
          </div>
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label>
              로그인 ID
              <input
                value={loginIdInput}
                onChange={(event) => setLoginIdInput(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                value={loginPasswordInput}
                onChange={(event) => setLoginPasswordInput(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="primary-button" disabled={loginSubmitting}>
              {loginSubmitting ? "로그인 중..." : "로그인"}
            </button>
            <p className="muted-text">
              개발 기본 계정: <code>center-admin</code> / <code>dev-admin-1234!</code>
            </p>
          </form>
        </section>
      </main>
    );
  }

  if (securityMode === "unknown") {
    return (
      <main className="app-shell">
        <section className="hero-card auth-card" aria-live="polite">
          <div>
            <h2>연결 상태 확인 필요</h2>
            <p>서버 보안 모드를 확인하지 못했습니다. 백엔드 서버/프록시 설정을 확인한 뒤 다시 시도해주세요.</p>
            {authError ? <p className="notice error">{authError}</p> : null}
          </div>
          <div className="auth-form">
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              새로고침
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>GYM CRM</h1>
          <p>{appSubtitle}</p>
        </div>
        <div className="topbar-actions">
          {authStatusMessage ? (
            <div className="inline-status-text" role="status" aria-live="polite">
              {authStatusMessage}
            </div>
          ) : null}
          <div className="prototype-badge" role="status" aria-live="polite">
            {modeBadgeText}
          </div>
          {isJwtMode && authUser ? (
            <button type="button" className="secondary-button" onClick={handleLogout}>
              로그아웃
            </button>
          ) : null}
        </div>
      </header>

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
        <aside className="sidebar" aria-label="관리자 기능 사이드바">
          <div className="sidebar-header">
            <h3>관리자 메뉴</h3>
            <p>{isJwtMode ? "로그인 세션 기반 운영 화면" : "프로토타입 모드 탐색 화면"}</p>
          </div>
          <nav className="sidebar-nav" aria-label="관리자 기능 탭">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeNavSection === item.key ? "sidebar-tab is-active" : "sidebar-tab"}
                onClick={() => setActiveNavSection(item.key)}
              >
                <span className="sidebar-tab-label">{item.label}</span>
                <span className="sidebar-tab-desc">{item.description}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-meta">
            <div>
              <span>현재 모드</span>
              <strong>{isJwtMode ? "JWT" : "PROTOTYPE"}</strong>
            </div>
            <div>
              <span>선택 회원</span>
              <strong>{selectedMember ? `#${selectedMember.memberId} ${selectedMember.memberName}` : "-"}</strong>
            </div>
            <div>
              <span>현재 사용자</span>
              <strong>{authUser ? `${authUser.displayName} (${authUser.roleCode})` : "로그인 없음"}</strong>
            </div>
          </div>
        </aside>

        <section className="portal-content" aria-label="관리자 포털 콘텐츠">
          <header className="content-header">
            <div>
              <h2>{navItems.find((item) => item.key === activeNavSection)?.label ?? "관리자 포털"}</h2>
              <p>
                {activeNavSection === "dashboard"
                  ? "핵심 업무 흐름과 현재 세션 상태를 요약해 확인합니다."
                  : activeNavSection === "members"
                    ? "회원 목록/등록/수정과 회원 기본 상세를 관리합니다."
                    : activeNavSection === "memberships"
                      ? "선택한 회원 기준으로 회원권 업무 상태를 확인하고 회원권 처리 흐름으로 이동합니다."
                      : "상품 목록/정책/상태를 관리합니다."}
              </p>
            </div>
            {activeNavSection === "memberships" && !selectedMember ? (
              <button type="button" className="secondary-button" onClick={() => setActiveNavSection("members")}>
                회원 선택하러 가기
              </button>
            ) : null}
          </header>

          {activeNavSection === "dashboard" ? (
            <section className="dashboard-grid" aria-label="대시보드 화면">
              <article className="panel">
                <div className="panel-header">
                  <h3>빠른 진입</h3>
                </div>
                <div className="quick-actions-grid">
                  <button type="button" className="secondary-button" onClick={() => setActiveNavSection("members")}>
                    회원 관리 열기
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setActiveNavSection("memberships")}
                    disabled={!selectedMember}
                  >
                    회원권 업무 열기
                  </button>
                  <button type="button" className="secondary-button" onClick={() => setActiveNavSection("products")}>
                    상품 관리 열기
                  </button>
                </div>
                {!selectedMember ? (
                  <p className="notice compact">회원권 업무를 사용하려면 먼저 회원 관리에서 회원을 선택해주세요.</p>
                ) : (
                  <p className="notice success compact">
                    선택된 회원: #{selectedMember.memberId} · {selectedMember.memberName}
                  </p>
                )}
                {isDeskRole ? (
                  <p className="notice compact">
                    DESK 권한은 상품 조회와 회원권 업무는 가능하지만 상품 변경은 제한됩니다.
                  </p>
                ) : null}
              </article>

              <article className="panel">
                <div className="panel-header">
                  <h3>핵심 API 경로 미리보기</h3>
                </div>
                <ul className="inline-route-list" aria-label="prototype routes">
                  {routePreview.map((route) => (
                    <li key={route.path}>
                      <code>{route.path}</code>
                      <span>{route.label}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="panel wide-panel">
                <div className="panel-header">
                  <h3>세션 현황</h3>
                </div>
                <dl className="detail-grid">
                  <div>
                    <dt>보안 모드</dt>
                    <dd>{securityMode}</dd>
                  </div>
                  <div>
                    <dt>인증 상태</dt>
                    <dd>{isAuthenticated ? "AUTHENTICATED" : "UNAUTHENTICATED"}</dd>
                  </div>
                  <div>
                    <dt>회원 수(조회 캐시)</dt>
                    <dd>{members.length}</dd>
                  </div>
                  <div>
                    <dt>상품 수(조회 캐시)</dt>
                    <dd>{products.length}</dd>
                  </div>
                  <div>
                    <dt>선택 회원</dt>
                    <dd>{selectedMember ? `#${selectedMember.memberId} ${selectedMember.memberName}` : "-"}</dd>
                  </div>
                  <div>
                    <dt>세션 회원권 수</dt>
                    <dd>{selectedMemberMemberships.length}</dd>
                  </div>
                </dl>
              </article>
            </section>
          ) : activeNavSection === "memberships" ? (
            <section className="membership-ops-shell" aria-label="회원권 업무 화면">
              {!selectedMember ? (
                <article className="panel">
                  <div className="panel-header">
                    <h3>회원 선택 필요</h3>
                  </div>
                  <div className="placeholder-card">
                    <p>회원권 업무는 선택된 회원 기준으로 동작합니다.</p>
                    <p className="muted-text">먼저 회원 관리 탭에서 회원을 선택한 뒤 다시 돌아오세요.</p>
                    <div className="form-actions">
                      <button type="button" className="primary-button" onClick={() => setActiveNavSection("members")}>
                        회원 관리로 이동
                      </button>
                    </div>
                  </div>
                </article>
              ) : (
                <>
                  <article className="panel">
                    <div className="panel-header">
                      <h3>선택 회원 요약</h3>
                      <button type="button" className="secondary-button" onClick={() => setActiveNavSection("members")}>
                        회원 정보 열기
                      </button>
                    </div>
                    <dl className="detail-grid">
                      <div>
                        <dt>회원 ID</dt>
                        <dd>{selectedMember.memberId}</dd>
                      </div>
                      <div>
                        <dt>회원명</dt>
                        <dd>{selectedMember.memberName}</dd>
                      </div>
                      <div>
                        <dt>연락처</dt>
                        <dd>{selectedMember.phone}</dd>
                      </div>
                      <div>
                        <dt>상태</dt>
                        <dd>{selectedMember.memberStatus}</dd>
                      </div>
                    </dl>
                    <p className="notice compact">선택 회원 기준 회원권 업무를 아래 패널에서 처리할 수 있습니다.</p>
                  </article>

                  {renderMembershipOperationsPanels()}
                </>
              )}
            </section>
          ) : activeNavSection === "members" ? (
        <section className="workspace-grid" aria-label="회원 관리 화면">
          <article className="panel">
            <div className="panel-header">
              <h3>회원 목록</h3>
              <button type="button" className="secondary-button" onClick={startCreateMember}>
                신규 등록
              </button>
            </div>
            <form
              className="toolbar-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void loadMembers();
              }}
            >
              <label>
                이름 검색
                <input value={memberSearchName} onChange={(e) => setMemberSearchName(e.target.value)} />
              </label>
              <label>
                연락처 검색
                <input value={memberSearchPhone} onChange={(e) => setMemberSearchPhone(e.target.value)} />
              </label>
              <div className="toolbar-actions">
                <button type="submit" className="primary-button" disabled={membersLoading}>
                  {membersLoading ? "조회 중..." : "조회"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMemberSearchName("");
                    setMemberSearchPhone("");
                    void loadMembers({ name: "", phone: "" });
                  }}
                >
                  초기화
                </button>
              </div>
            </form>

            {memberPanelMessage ? <p className="notice success">{memberPanelMessage}</p> : null}
            {memberPanelError ? <p className="notice error">{memberPanelError}</p> : null}

            <div className="list-shell">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>이름</th>
                    <th>연락처</th>
                    <th>상태</th>
                    <th>가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-cell">
                        조회된 회원이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr
                        key={member.memberId}
                        className={member.memberId === selectedMemberId ? "is-selected" : ""}
                        onClick={() => void loadMemberDetail(member.memberId)}
                      >
                        <td>{member.memberId}</td>
                        <td>{member.memberName}</td>
                        <td>{member.phone}</td>
                        <td>
                          <span className={member.memberStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                            {member.memberStatus}
                          </span>
                        </td>
                        <td>{formatDate(member.joinDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>{memberFormMode === "create" ? "회원 등록" : `회원 수정 #${selectedMemberId ?? "-"}`}</h3>
              {memberFormMode === "edit" ? (
                <button type="button" className="secondary-button" onClick={startCreateMember}>
                  등록 모드로 전환
                </button>
              ) : null}
            </div>

            <form className="form-grid" onSubmit={handleMemberSubmit}>
              <label>
                회원명 *
                <input
                  required
                  value={memberForm.memberName}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, memberName: e.target.value }))}
                />
              </label>
              <label>
                연락처 *
                <input
                  required
                  placeholder="010-1234-5678"
                  value={memberForm.phone}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label>
                이메일
                <input
                  type="email"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </label>
              <label>
                성별
                <select
                  value={memberForm.gender}
                  onChange={(e) =>
                    setMemberForm((prev) => ({ ...prev, gender: e.target.value as MemberFormState["gender"] }))
                  }
                >
                  <option value="">선택 안함</option>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </label>
              <label>
                생년월일
                <input
                  type="date"
                  value={memberForm.birthDate}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                />
              </label>
              <label>
                가입일
                <input
                  type="date"
                  value={memberForm.joinDate}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, joinDate: e.target.value }))}
                />
              </label>
              <label>
                상태 *
                <select
                  value={memberForm.memberStatus}
                  onChange={(e) =>
                    setMemberForm((prev) => ({ ...prev, memberStatus: e.target.value as "ACTIVE" | "INACTIVE" }))
                  }
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={memberForm.consentSms}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, consentSms: e.target.checked }))}
                />
                SMS 수신 동의
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={memberForm.consentMarketing}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, consentMarketing: e.target.checked }))}
                />
                마케팅 수신 동의
              </label>
              <label className="full-row">
                메모
                <textarea
                  rows={3}
                  value={memberForm.memo}
                  onChange={(e) => setMemberForm((prev) => ({ ...prev, memo: e.target.value }))}
                />
              </label>
              <div className="form-actions full-row">
                <button type="submit" className="primary-button" disabled={memberFormSubmitting}>
                  {memberFormSubmitting
                    ? "저장 중..."
                    : memberFormMode === "create"
                      ? "회원 등록"
                      : "회원 수정 저장"}
                </button>
              </div>
            </form>
          </article>

          <article className="panel wide-panel">
            <div className="panel-header">
              <h3>회원 상세</h3>
              {memberDetailLoading ? <span className="muted-text">불러오는 중...</span> : null}
            </div>
            {!selectedMember ? (
              <div className="placeholder-card">
                <p>회원 목록에서 항목을 선택하면 상세 정보를 표시합니다.</p>
              </div>
            ) : (
              <div className="detail-stack">
                <dl className="detail-grid">
                  <div>
                    <dt>회원 ID</dt>
                    <dd>{selectedMember.memberId}</dd>
                  </div>
                  <div>
                    <dt>센터 ID</dt>
                    <dd>{selectedMember.centerId}</dd>
                  </div>
                  <div>
                    <dt>회원명</dt>
                    <dd>{selectedMember.memberName}</dd>
                  </div>
                  <div>
                    <dt>연락처</dt>
                    <dd>{selectedMember.phone}</dd>
                  </div>
                  <div>
                    <dt>상태</dt>
                    <dd>{selectedMember.memberStatus}</dd>
                  </div>
                  <div>
                    <dt>가입일</dt>
                    <dd>{formatDate(selectedMember.joinDate)}</dd>
                  </div>
                  <div>
                    <dt>이메일</dt>
                    <dd>{selectedMember.email ?? "-"}</dd>
                  </div>
                  <div>
                    <dt>성별</dt>
                    <dd>{selectedMember.gender ?? "-"}</dd>
                  </div>
                </dl>

                <section className="placeholder-card">
                  <h4>회원권 업무는 별도 탭으로 이동</h4>
                  <p>구매/홀딩/해제/환불/결제이력은 사이드바의 `회원권 업무` 탭에서 처리합니다.</p>
                  <div className="detail-grid compact-detail-grid">
                    <div>
                      <dt>세션 회원권 수</dt>
                      <dd>{selectedMemberMemberships.length}</dd>
                    </div>
                    <div>
                      <dt>세션 결제 이력 수</dt>
                      <dd>{selectedMemberPayments.length}</dd>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setActiveNavSection("memberships")}
                    >
                      회원권 업무 탭 열기
                    </button>
                  </div>
                </section>
              </div>
            )}
          </article>
        </section>
      ) : activeNavSection === "products" ? (
        <section className="workspace-grid" aria-label="상품 관리 화면">
          <article className="panel">
            <div className="panel-header">
              <h3>상품 목록</h3>
              <button
                type="button"
                className="secondary-button"
                onClick={startCreateProduct}
                disabled={!canManageProducts}
                title={!canManageProducts ? "DESK 권한은 상품 변경이 제한됩니다." : undefined}
              >
                신규 등록
              </button>
            </div>
            {!canManageProducts ? (
              <p className="notice compact">DESK 권한은 상품 조회만 가능합니다. 상품 등록/수정/상태변경은 제한됩니다.</p>
            ) : null}

            <form
              className="toolbar-grid"
              onSubmit={(event) => {
                event.preventDefault();
                void loadProducts();
              }}
            >
              <label>
                카테고리
                <select
                  value={productFilters.category}
                  onChange={(e) =>
                    setProductFilters((prev) => ({ ...prev, category: e.target.value as ProductFilters["category"] }))
                  }
                >
                  <option value="">전체</option>
                  <option value="MEMBERSHIP">MEMBERSHIP</option>
                  <option value="PT">PT</option>
                  <option value="GX">GX</option>
                  <option value="ETC">ETC</option>
                </select>
              </label>
              <label>
                상태
                <select
                  value={productFilters.status}
                  onChange={(e) =>
                    setProductFilters((prev) => ({ ...prev, status: e.target.value as ProductFilters["status"] }))
                  }
                >
                  <option value="">전체</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <div className="toolbar-actions">
                <button type="submit" className="primary-button" disabled={productsLoading}>
                  {productsLoading ? "조회 중..." : "조회"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const emptyFilters: ProductFilters = { category: "", status: "" };
                    setProductFilters(emptyFilters);
                    void loadProducts(emptyFilters);
                  }}
                >
                  초기화
                </button>
              </div>
            </form>

            {productPanelMessage ? <p className="notice success">{productPanelMessage}</p> : null}
            {productPanelError ? <p className="notice error">{productPanelError}</p> : null}

            <div className="list-shell">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>상품명</th>
                    <th>유형</th>
                    <th>카테고리</th>
                    <th>가격</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">
                        조회된 상품이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr
                        key={product.productId}
                        className={product.productId === selectedProductId ? "is-selected" : ""}
                        onClick={() => void loadProductDetail(product.productId)}
                      >
                        <td>{product.productId}</td>
                        <td>{product.productName}</td>
                        <td>{product.productType}</td>
                        <td>{product.productCategory ?? "-"}</td>
                        <td>{formatCurrency(product.priceAmount)}</td>
                        <td>
                          <span className={product.productStatus === "ACTIVE" ? "pill ok" : "pill muted"}>
                            {product.productStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>{productFormMode === "create" ? "상품 등록" : `상품 수정 #${selectedProductId ?? "-"}`}</h3>
              <div className="inline-actions">
                {productFormMode === "edit" ? (
                  <button type="button" className="secondary-button" onClick={startCreateProduct} disabled={!canManageProducts}>
                    등록 모드로 전환
                  </button>
                ) : null}
                {selectedProduct ? (
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void handleProductStatusToggle()}
                    disabled={productFormSubmitting || !canManageProducts}
                  >
                    상태 토글 ({selectedProduct.productStatus})
                  </button>
                ) : null}
              </div>
            </div>
            {!canManageProducts ? (
              <p className="notice compact">상품 정책 변경은 `ROLE_CENTER_ADMIN` 권한에서만 가능합니다.</p>
            ) : null}

            <form className="form-grid" onSubmit={handleProductSubmit}>
              <fieldset className="form-fieldset" disabled={!canManageProducts || productFormSubmitting}>
              <label className="full-row">
                상품명 *
                <input
                  required
                  value={productForm.productName}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, productName: e.target.value }))}
                />
              </label>
              <label>
                카테고리
                <select
                  value={productForm.productCategory}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      productCategory: e.target.value as ProductFormState["productCategory"]
                    }))
                  }
                >
                  <option value="">선택 안함</option>
                  <option value="MEMBERSHIP">MEMBERSHIP</option>
                  <option value="PT">PT</option>
                  <option value="GX">GX</option>
                  <option value="ETC">ETC</option>
                </select>
              </label>
              <label>
                유형 *
                <select
                  value={productForm.productType}
                  onChange={(e) => {
                    const nextType = e.target.value as ProductFormState["productType"];
                    setProductForm((prev) => ({
                      ...prev,
                      productType: nextType,
                      validityDays: nextType === "DURATION" ? prev.validityDays || "30" : "",
                      totalCount: nextType === "COUNT" ? prev.totalCount || "10" : ""
                    }));
                  }}
                >
                  <option value="DURATION">DURATION</option>
                  <option value="COUNT">COUNT</option>
                </select>
              </label>
              <label>
                가격 (KRW) *
                <input
                  required
                  inputMode="decimal"
                  value={productForm.priceAmount}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, priceAmount: e.target.value }))}
                />
              </label>
              <label>
                유효일수 {productForm.productType === "DURATION" ? "*" : ""}
                <input
                  inputMode="numeric"
                  disabled={productForm.productType !== "DURATION"}
                  value={productForm.validityDays}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, validityDays: e.target.value }))}
                />
              </label>
              <label>
                총횟수 {productForm.productType === "COUNT" ? "*" : ""}
                <input
                  inputMode="numeric"
                  disabled={productForm.productType !== "COUNT"}
                  value={productForm.totalCount}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, totalCount: e.target.value }))}
                />
              </label>
              <label>
                상태
                <select
                  value={productForm.productStatus}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      productStatus: e.target.value as ProductFormState["productStatus"]
                    }))
                  }
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={productForm.allowHold}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, allowHold: e.target.checked }))}
                />
                홀딩 허용
              </label>
              <label>
                최대 홀딩일
                <input
                  inputMode="numeric"
                  disabled={!productForm.allowHold}
                  value={productForm.maxHoldDays}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, maxHoldDays: e.target.value }))}
                />
              </label>
              <label>
                최대 홀딩횟수
                <input
                  inputMode="numeric"
                  disabled={!productForm.allowHold}
                  value={productForm.maxHoldCount}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, maxHoldCount: e.target.value }))}
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={productForm.allowTransfer}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, allowTransfer: e.target.checked }))}
                />
                양도 허용
              </label>
              <label className="full-row">
                설명
                <textarea
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>
              <div className="form-actions full-row">
                <button type="submit" className="primary-button" disabled={productFormSubmitting || !canManageProducts}>
                  {productFormSubmitting
                    ? "저장 중..."
                    : productFormMode === "create"
                      ? "상품 등록"
                      : "상품 수정 저장"}
                </button>
              </div>
              </fieldset>
            </form>
          </article>

          <article className="panel wide-panel">
            <div className="panel-header">
              <h3>상품 상세</h3>
              {productDetailLoading ? <span className="muted-text">불러오는 중...</span> : null}
            </div>
            {!selectedProduct ? (
              <div className="placeholder-card">
                <p>상품 목록에서 항목을 선택하면 상세/수정 폼이 동기화됩니다.</p>
              </div>
            ) : (
              <dl className="detail-grid">
                <div>
                  <dt>상품 ID</dt>
                  <dd>{selectedProduct.productId}</dd>
                </div>
                <div>
                  <dt>센터 ID</dt>
                  <dd>{selectedProduct.centerId}</dd>
                </div>
                <div>
                  <dt>상품명</dt>
                  <dd>{selectedProduct.productName}</dd>
                </div>
                <div>
                  <dt>카테고리</dt>
                  <dd>{selectedProduct.productCategory ?? "-"}</dd>
                </div>
                <div>
                  <dt>유형</dt>
                  <dd>{selectedProduct.productType}</dd>
                </div>
                <div>
                  <dt>가격</dt>
                  <dd>{formatCurrency(selectedProduct.priceAmount)}</dd>
                </div>
                <div>
                  <dt>유효일수</dt>
                  <dd>{selectedProduct.validityDays ?? "-"}</dd>
                </div>
                <div>
                  <dt>총횟수</dt>
                  <dd>{selectedProduct.totalCount ?? "-"}</dd>
                </div>
                <div>
                  <dt>홀딩 정책</dt>
                  <dd>
                    {selectedProduct.allowHold
                      ? `허용 (최대 ${selectedProduct.maxHoldDays ?? "-"}일 / ${selectedProduct.maxHoldCount ?? "-"}회)`
                      : "불가"}
                  </dd>
                </div>
                <div>
                  <dt>양도</dt>
                  <dd>{selectedProduct.allowTransfer ? "허용" : "불가"}</dd>
                </div>
                <div>
                  <dt>상태</dt>
                  <dd>{selectedProduct.productStatus}</dd>
                </div>
                <div>
                  <dt>설명</dt>
                  <dd>{selectedProduct.description ?? "-"}</dd>
                </div>
              </dl>
            )}
          </article>
        </section>
      ) : null}
        </section>
      </div>
    </main>
  );
}
