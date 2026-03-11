import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const authSessionState = {
  securityMode: "jwt",
  prototypeNoAuth: false,
  authBootstrapping: false,
  authAccessToken: null,
  authUser: null,
  authStatusMessage: null,
  authError: null,
  loginSubmitting: false,
  isPrototypeMode: false,
  isJwtMode: true,
  isAuthenticated: false,
  login: vi.fn(),
  logout: vi.fn()
};

vi.mock("./shared/hooks/useAuthSession", () => ({
  useAuthSession: () => authSessionState
}));

vi.mock("./shared/hooks/useThemePreference", () => ({
  useThemePreference: () => ({ themePreference: "light", setThemePreference: vi.fn(), resolvedTheme: "light" }),
  detectSystemTheme: () => "light"
}));

vi.mock("./shared/hooks/useMembershipDateFilter", () => ({
  useMembershipDateFilter: () => ({
    dateFilter: { presetRange: "", dateFrom: "", dateTo: "" },
    applyPreset: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    reset: vi.fn()
  })
}));

vi.mock("./shared/hooks/useWorkspaceLoaders", () => ({
  useReservationsWorkspaceLoader: vi.fn(),
  useAccessWorkspaceLoader: vi.fn(),
  useLockerWorkspaceLoader: vi.fn(),
  useSettlementWorkspaceLoader: vi.fn(),
  useCrmWorkspaceLoader: vi.fn()
}));

vi.mock("./shared/hooks/useWorkspaceMemberSearchLoader", () => ({
  useWorkspaceMemberSearchLoader: () => ({ load: vi.fn().mockResolvedValue([]), invalidate: vi.fn() })
}));

vi.mock("./shared/api/client", () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;

    constructor(message: string, options: { status: number }) {
      super(message);
      this.status = options.status;
    }
  },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn()
}));

vi.mock("./features/auth/BootstrappingScreen", () => ({
  BootstrappingScreen: () => <div>BOOTSTRAPPING</div>
}));
vi.mock("./features/auth/LoginScreen", () => ({
  LoginScreen: () => <div>LOGIN_SCREEN</div>
}));
vi.mock("./features/auth/UnknownSecurityScreen", () => ({
  UnknownSecurityScreen: () => <div>UNKNOWN_SECURITY</div>
}));

vi.mock("./components/layout/TopBar", () => ({ TopBar: () => <div>TOPBAR</div> }));
vi.mock("./components/layout/ContentHeader", () => ({ ContentHeader: () => <div>CONTENT_HEADER</div> }));
vi.mock("./components/layout/SidebarNav", () => ({ SidebarNav: () => <div>SIDEBAR</div> }));

vi.mock("./features/dashboard/DashboardSection", () => ({
  DashboardSection: () => <div>DASHBOARD_SECTION</div>
}));
vi.mock("./features/members/MembersSection", () => ({ MembersSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./features/members/MemberManagementPanels", () => ({ MemberManagementPanels: () => <div>MEMBERS_SECTION</div> }));
vi.mock("./features/memberships/MembershipsSection", () => ({ MembershipsSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./features/reservations/ReservationsSection", () => ({ ReservationsSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./features/access/AccessSection", () => ({ AccessSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./features/lockers/LockersSection", () => ({ LockersSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./features/crm/CrmSection", () => ({ CrmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./features/settlements/SettlementsSection", () => ({ SettlementsSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("./features/products/ProductsSection", () => ({ ProductsSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));

vi.mock("./features/access/useAccessWorkspaceState", () => ({
  useAccessWorkspaceState: () => ({
    accessMemberQuery: "",
    setAccessMemberQuery: vi.fn(),
    accessSelectedMemberId: null,
    setAccessSelectedMemberId: vi.fn(),
    accessPresence: [],
    setAccessPresence: vi.fn(),
    accessEvents: [],
    setAccessEvents: vi.fn(),
    accessPresenceLoading: false,
    setAccessPresenceLoading: vi.fn(),
    accessEventsLoading: false,
    setAccessEventsLoading: vi.fn(),
    accessActionSubmitting: false,
    setAccessActionSubmitting: vi.fn(),
    accessPanelMessage: null,
    setAccessPanelMessage: vi.fn(),
    accessPanelError: null,
    setAccessPanelError: vi.fn(),
    resetAccessWorkspace: vi.fn()
  })
}));

vi.mock("./features/access/useAccessQueries", () => ({
  useAccessQueries: () => ({
    accessQueryError: null,
    loadAccessPresence: vi.fn(),
    loadAccessEvents: vi.fn(),
    reloadAccessData: vi.fn(),
    resetAccessQueries: vi.fn()
  })
}));

vi.mock("./features/crm/useCrmWorkspaceState", () => ({
  useCrmWorkspaceState: () => ({
    crmFilters: { keyword: "", status: "", eventType: "" },
    setCrmFilters: vi.fn(),
    crmTriggerDaysAhead: "7",
    setCrmTriggerDaysAhead: vi.fn(),
    crmTriggerSubmitting: false,
    setCrmTriggerSubmitting: vi.fn(),
    crmProcessSubmitting: false,
    setCrmProcessSubmitting: vi.fn(),
    crmPanelMessage: null,
    setCrmPanelMessage: vi.fn(),
    crmPanelError: null,
    setCrmPanelError: vi.fn(),
    resetCrmWorkspace: vi.fn()
  })
}));

vi.mock("./features/crm/useCrmHistoryQuery", () => ({
  useCrmHistoryQuery: () => ({
    crmHistoryRows: [],
    crmHistoryLoading: false,
    crmHistoryError: null,
    loadCrmHistory: vi.fn(),
    resetCrmHistoryQuery: vi.fn()
  })
}));

vi.mock("./features/lockers/useLockerWorkspaceState", () => ({
  createEmptyLockerAssignForm: () => ({ lockerSlotId: "", memberId: "", startDate: "", endDate: "", memo: "" }),
  useLockerWorkspaceState: () => ({
    lockerFilters: { productType: "", lockerStatus: "", searchKeyword: "" },
    setLockerFilters: vi.fn(),
    lockerAssignForm: { lockerSlotId: "", memberId: "", startDate: "", endDate: "", memo: "" },
    setLockerAssignForm: vi.fn(),
    lockerAssignSubmitting: false,
    setLockerAssignSubmitting: vi.fn(),
    lockerReturnSubmittingId: null,
    setLockerReturnSubmittingId: vi.fn(),
    lockerPanelMessage: null,
    setLockerPanelMessage: vi.fn(),
    lockerPanelError: null,
    setLockerPanelError: vi.fn(),
    resetLockerWorkspace: vi.fn()
  })
}));

vi.mock("./features/lockers/useLockerQueries", () => ({
  useLockerQueries: () => ({
    lockerSlots: [],
    lockerSlotsLoading: false,
    lockerAssignments: [],
    lockerAssignmentsLoading: false,
    lockerQueryError: null,
    loadLockerSlots: vi.fn(),
    loadLockerAssignments: vi.fn(),
    resetLockerQueries: vi.fn()
  })
}));

vi.mock("./features/members/useMembersQuery", () => ({
  useMembersQuery: () => ({
    members: [],
    membersLoading: false,
    membersQueryError: null,
    loadMembers: vi.fn(),
    runMembersQuery: vi.fn(),
    resetMembersQuery: vi.fn()
  })
}));

vi.mock("./features/memberships/useMembershipWorkspaceState", () => ({
  createEmptyPurchaseForm: () => ({ productId: "", startDate: "", paidAmount: "", paymentMethod: "CARD", membershipMemo: "", paymentMemo: "" }),
  createDefaultMembershipActionDraft: () => ({ holdStartDate: "", holdEndDate: "", holdReason: "", holdMemo: "", resumeDate: "", refundDate: "", refundPaymentMethod: "CARD", refundReason: "", refundMemo: "", refundPaymentMemo: "" }),
  useMembershipWorkspaceState: () => ({
    purchaseForm: { productId: "", startDate: "", paidAmount: "", paymentMethod: "CARD", membershipMemo: "", paymentMemo: "" },
    setPurchaseForm: vi.fn(),
    memberPurchaseSubmitting: false,
    setMemberPurchaseSubmitting: vi.fn(),
    memberPurchaseMessage: null,
    setMemberPurchaseMessage: vi.fn(),
    memberPurchaseError: null,
    setMemberPurchaseError: vi.fn(),
    membershipActionDrafts: {},
    setMembershipActionDrafts: vi.fn(),
    membershipActionSubmittingId: null,
    setMembershipActionSubmittingId: vi.fn(),
    membershipActionMessageById: {},
    setMembershipActionMessageById: vi.fn(),
    membershipActionErrorById: {},
    setMembershipActionErrorById: vi.fn(),
    membershipRefundPreviewById: {},
    setMembershipRefundPreviewById: vi.fn(),
    membershipRefundPreviewLoadingId: null,
    setMembershipRefundPreviewLoadingId: vi.fn(),
    resetMembershipWorkspace: vi.fn()
  })
}));

vi.mock("./features/products/useProductWorkspaceState", () => ({
  EMPTY_PRODUCT_FORM: { productCategory: "MEMBERSHIP", productType: "DURATION", productStatus: "ACTIVE", productName: "", priceAmount: "", durationDays: "", totalCount: "", memo: "" },
  useProductWorkspaceState: () => ({
    productFilters: { category: "", status: "", type: "", keyword: "" },
    setProductFilters: vi.fn(),
    selectedProductId: null,
    setSelectedProductId: vi.fn(),
    selectedProduct: null,
    setSelectedProduct: vi.fn(),
    productFormMode: "create",
    setProductFormMode: vi.fn(),
    productForm: { productCategory: "MEMBERSHIP", productType: "DURATION", productStatus: "ACTIVE", productName: "", priceAmount: "", durationDays: "", totalCount: "", memo: "" },
    setProductForm: vi.fn(),
    productFormOpen: false,
    setProductFormOpen: vi.fn(),
    productFormSubmitting: false,
    setProductFormSubmitting: vi.fn(),
    productPanelMessage: null,
    setProductPanelMessage: vi.fn(),
    productPanelError: null,
    setProductPanelError: vi.fn(),
    productFormMessage: null,
    setProductFormMessage: vi.fn(),
    productFormError: null,
    setProductFormError: vi.fn(),
    resetProductWorkspace: vi.fn()
  })
}));

vi.mock("./features/products/useProductsQuery", () => ({
  useProductsQuery: () => ({
    products: [],
    productsLoading: false,
    productsQueryError: null,
    loadProducts: vi.fn(),
    runProductsQuery: vi.fn(),
    resetProductsQuery: vi.fn()
  })
}));

vi.mock("./features/reservations/useReservationWorkspaceState", () => ({
  EMPTY_RESERVATION_CREATE_FORM: { membershipId: "", scheduleId: "", memo: "" },
  useReservationWorkspaceState: () => ({
    reservationCreateForm: { membershipId: "", scheduleId: "", memo: "" },
    setReservationCreateForm: vi.fn(),
    reservationCreateSubmitting: false,
    setReservationCreateSubmitting: vi.fn(),
    reservationLoading: false,
    setReservationLoading: vi.fn(),
    reservationActionSubmittingId: null,
    setReservationActionSubmittingId: vi.fn(),
    reservationRowsByMemberId: {},
    setReservationRowsByMemberId: vi.fn(),
    reservationPanelMessage: null,
    setReservationPanelMessage: vi.fn(),
    reservationPanelError: null,
    setReservationPanelError: vi.fn(),
    resetReservationWorkspace: vi.fn()
  })
}));

vi.mock("./features/reservations/useReservationSchedulesQuery", () => ({
  useReservationSchedulesQuery: () => ({
    reservationSchedules: [],
    reservationSchedulesLoading: false,
    reservationSchedulesError: null,
    loadReservationSchedules: vi.fn(),
    resetReservationSchedulesQuery: vi.fn()
  })
}));

vi.mock("./features/reservations/useReservationTargetsQuery", () => ({
  useReservationTargetsQuery: () => ({
    reservationTargets: [],
    reservationTargetsLoading: false,
    reservationTargetsKeyword: "",
    setReservationTargetsKeyword: vi.fn(),
    reservationTargetsError: null,
    loadReservationTargets: vi.fn(),
    resetReservationTargetsQuery: vi.fn()
  })
}));

vi.mock("./features/settlements/useSettlementWorkspaceState", () => ({
  useSettlementWorkspaceState: () => ({
    settlementFilters: { dateFrom: "", dateTo: "", productId: "", paymentMethod: "" },
    setSettlementFilters: vi.fn(),
    settlementPanelMessage: null,
    setSettlementPanelMessage: vi.fn(),
    settlementPanelError: null,
    setSettlementPanelError: vi.fn(),
    resetSettlementWorkspace: vi.fn()
  })
}));

vi.mock("./features/settlements/useSettlementReportQuery", () => ({
  useSettlementReportQuery: () => ({
    settlementReport: null,
    settlementReportLoading: false,
    settlementReportMessage: null,
    settlementReportError: null,
    loadSettlementReport: vi.fn(),
    resetSettlementReportQuery: vi.fn()
  })
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

describe("App shell routing", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    authSessionState.securityMode = "jwt";
    authSessionState.prototypeNoAuth = false;
    authSessionState.authBootstrapping = false;
    authSessionState.authAccessToken = null;
    authSessionState.authUser = null;
    authSessionState.authStatusMessage = null;
    authSessionState.authError = null;
    authSessionState.loginSubmitting = false;
    authSessionState.isPrototypeMode = false;
    authSessionState.isJwtMode = true;
    authSessionState.isAuthenticated = false;
  });

  it("redirects unauthenticated jwt section routes to /login", async () => {
    render(
      <MemoryRouter initialEntries={["/members"]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("LOGIN_SCREEN")).toBeTruthy();
      expect(screen.getByTestId("location").textContent).toBe("/login");
    });
  });

  it("keeps protected routes on the bootstrapping screen until auth bootstrap completes", async () => {
    authSessionState.authBootstrapping = true;

    render(
      <MemoryRouter initialEntries={["/members"]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("BOOTSTRAPPING")).toBeTruthy();
      expect(screen.queryByText("LOGIN_SCREEN")).toBeNull();
      expect(screen.getByTestId("location").textContent).toBe("/members");
    });
  });

  it("keeps /login on the bootstrapping screen until jwt session restore finishes", async () => {
    authSessionState.authBootstrapping = true;

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("BOOTSTRAPPING")).toBeTruthy();
      expect(screen.queryByText("LOGIN_SCREEN")).toBeNull();
      expect(screen.getByTestId("location").textContent).toBe("/login");
    });
  });

  it("redirects root to /dashboard in prototype mode", async () => {
    authSessionState.securityMode = "prototype";
    authSessionState.prototypeNoAuth = true;
    authSessionState.isPrototypeMode = true;
    authSessionState.isJwtMode = false;
    authSessionState.isAuthenticated = true;

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("DASHBOARD_SECTION")).toBeTruthy();
      expect(screen.getByTestId("location").textContent).toBe("/dashboard");
    });
  });

  it("redirects unknown paths to /dashboard when authenticated", async () => {
    authSessionState.securityMode = "prototype";
    authSessionState.prototypeNoAuth = true;
    authSessionState.isPrototypeMode = true;
    authSessionState.isJwtMode = false;
    authSessionState.isAuthenticated = true;

    render(
      <MemoryRouter initialEntries={["/not-a-route"]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("DASHBOARD_SECTION")).toBeTruthy();
      expect(screen.getByTestId("location").textContent).toBe("/dashboard");
    });
  });
});
