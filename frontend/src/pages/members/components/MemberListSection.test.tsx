import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../../app/auth";
import { MemberListSection } from "./MemberListSection";

const navigateMock = vi.fn();
let currentRefetch = vi.fn();
let currentSelectedMemberId: number | null = null;
let currentSelectedMember: {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  email: null;
  gender: null;
  birthDate: null;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string;
  consentSms: boolean;
  consentMarketing: boolean;
  memo: null;
} | null = null;
let selectMemberMock = vi.fn();
const clearSelectedMemberMock = vi.fn(() => {
  currentSelectedMemberId = null;
  currentSelectedMember = null;
});

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("./MembershipPeriodFilter", () => ({
  MembershipPeriodFilter: () => <div>period-filter</div>,
}));

vi.mock("../modules/useMembershipDateFilter", () => ({
  useMembershipDateFilter: () => ({
    dateFilter: {
      presetRange: "",
      dateFrom: "",
      dateTo: "",
    },
    applyPreset: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    reset: vi.fn(),
  }),
}));

vi.mock("../modules/SelectedMemberContext", () => ({
  useSelectedMemberStore: () => ({
    selectedMemberId: currentSelectedMemberId,
    selectedMember: currentSelectedMember,
    selectedMemberLoading: false,
    clearSelectedMember: clearSelectedMemberMock,
    selectMember: selectMemberMock,
  }),
}));

vi.mock("../modules/useMembersQuery", () => ({
  useMembersQuery: () => ({
    members: [
      {
        memberId: 101,
        centerId: 1,
        memberName: "김민수",
        phone: "010-1234-5678",
        memberStatus: "ACTIVE",
        joinDate: "2026-01-04",
        membershipOperationalStatus: "홀딩중",
        membershipExpiryDate: "2026-06-30",
        remainingPtCount: 8,
      },
    ],
    membersLoading: false,
    membersQueryError: null,
    refetch: currentRefetch,
  }),
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe("MemberListSection", () => {
  function renderWithAuth(
    authUser: { userId: number; username: string; primaryRole: string; roles: string[] } = {
      userId: 11,
      username: "jwt-admin",
      primaryRole: "ROLE_CENTER_ADMIN",
      roles: ["ROLE_CENTER_ADMIN"],
    },
  ) {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            securityMode: "jwt",
            authBootstrapping: false,
            authUser,
          }}
        >
          <MemberListSection />
        </AuthStateProvider>
      </QueryClientProvider>,
    );
  }

  beforeEach(() => {
    navigateMock.mockReset();
    clearSelectedMemberMock.mockClear();
    currentRefetch = vi.fn();
    currentSelectedMemberId = null;
    currentSelectedMember = null;
    selectMemberMock = vi.fn();
    queryClient.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders membership operational status in Korean", () => {
    renderWithAuth();

    expect(screen.getAllByText("홀딩중").length).toBeGreaterThan(0);
    expect(screen.queryByText("HOLDING")).toBeNull();
  });

  it("does not imperatively refetch members on mount", () => {
    renderWithAuth();

    expect(currentRefetch).not.toHaveBeenCalled();
  });

  it("opens the selected member modal after a successful row click", async () => {
    selectMemberMock = vi.fn(async () => {
      currentSelectedMemberId = 101;
      currentSelectedMember = {
        memberId: 101,
        centerId: 1,
        memberName: "김민수",
        phone: "010-1234-5678",
        email: null,
        gender: null,
        birthDate: null,
        memberStatus: "ACTIVE",
        joinDate: "2026-01-04",
        consentSms: true,
        consentMarketing: false,
        memo: null,
      } as any;
      return true;
    });

    renderWithAuth();

    fireEvent.click(screen.getByText("김민수"));
    await waitFor(() => expect(selectMemberMock).toHaveBeenCalledWith(101));

    expect(screen.getByRole("dialog", { name: /김민수 회원 정보/ })).toBeTruthy();
    expect(screen.getByText("회원 상태")).toBeTruthy();
  });

  it("keeps nested membership action from opening the detail modal", async () => {
    selectMemberMock = vi.fn(async () => {
      currentSelectedMemberId = 101;
      currentSelectedMember = {
        memberId: 101,
        centerId: 1,
        memberName: "김민수",
        phone: "010-1234-5678",
        email: null,
        gender: null,
        birthDate: null,
        memberStatus: "ACTIVE",
        joinDate: "2026-01-04",
        consentSms: true,
        consentMarketing: false,
        memo: null,
      } as any;
      return true;
    });

    renderWithAuth();

    fireEvent.click(screen.getByRole("button", { name: "회원권" }));
    await waitFor(() => expect(selectMemberMock).toHaveBeenCalledWith(101));

    expect(navigateMock).toHaveBeenCalledWith("/memberships");
    expect(screen.queryByRole("dialog", { name: "선택 회원 정보" })).toBeNull();
  }, 15000);

  it("shows member create entry for admin and hides it for trainer", () => {
    const { rerender } = renderWithAuth();

    expect(screen.getByRole("button", { name: /회원 등록/ })).toBeTruthy();

    rerender(
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            securityMode: "jwt",
            authBootstrapping: false,
            authUser: { userId: 41, username: "jwt-trainer", primaryRole: "ROLE_TRAINER", roles: ["ROLE_TRAINER"] },
          }}
        >
          <MemberListSection />
        </AuthStateProvider>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole("button", { name: /회원 등록/ })).toBeNull();
  }, 15000);

  it("resets filters on reset button click", () => {
    renderWithAuth();

    fireEvent.change(screen.getByPlaceholderText("이름 검색"), { target: { value: "김민수" } });
    fireEvent.change(screen.getByPlaceholderText("010-..."), { target: { value: "010-1234" } });

    fireEvent.click(screen.getByRole("button", { name: /초기화/ }));

    expect((screen.getByPlaceholderText("이름 검색") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("010-...") as HTMLInputElement).value).toBe("");
  }, 15000);
});
