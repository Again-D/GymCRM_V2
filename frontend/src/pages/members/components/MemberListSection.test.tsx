import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../../app/auth";
import { MemberListSection } from "./MemberListSection";

const navigateMock = vi.fn();
let currentLoadMembers = vi.fn();
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
  useNavigate: () => navigateMock
}));

vi.mock("./MembershipPeriodFilter", () => ({
  MembershipPeriodFilter: () => <div>period-filter</div>
}));

vi.mock("../modules/useMembershipDateFilter", () => ({
  useMembershipDateFilter: () => ({
    dateFilter: {
      presetRange: "",
      dateFrom: "",
      dateTo: ""
    },
    applyPreset: vi.fn(),
    setDateFrom: vi.fn(),
    setDateTo: vi.fn(),
    reset: vi.fn()
  })
}));

vi.mock("../modules/SelectedMemberContext", () => ({
  useSelectedMemberStore: () => ({
    selectedMemberId: currentSelectedMemberId,
    selectedMember: currentSelectedMember,
    selectedMemberLoading: false,
    clearSelectedMember: clearSelectedMemberMock,
    selectMember: selectMemberMock
  })
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
        remainingPtCount: 8
      }
    ],
    membersLoading: false,
    membersQueryError: null,
    loadMembers: currentLoadMembers
  })
}));

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
});

describe("MemberListSection", () => {
  function renderWithAuth(
    authUser: { userId: number; username: string; primaryRole: string; roles: string[] } = {
      userId: 11,
      username: "jwt-admin",
      primaryRole: "ROLE_CENTER_ADMIN",
      roles: ["ROLE_CENTER_ADMIN"]
    }
  ) {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            securityMode: "jwt",
            authBootstrapping: false,
            authUser
          }}
        >
          <MemberListSection />
        </AuthStateProvider>
      </QueryClientProvider>
    );
  }

  beforeEach(() => {
    navigateMock.mockReset();
    clearSelectedMemberMock.mockClear();
    currentLoadMembers = vi.fn();
    currentSelectedMemberId = null;
    currentSelectedMember = null;
    selectMemberMock = vi.fn();
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

  it("reruns bootstrap loading when loadMembers reference changes", () => {
    const firstLoadMembers = vi.fn();
    currentLoadMembers = firstLoadMembers;

    const { rerender } = renderWithAuth();

    expect(firstLoadMembers).toHaveBeenCalledTimes(1);

    const secondLoadMembers = vi.fn();
    currentLoadMembers = secondLoadMembers;
    rerender(
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            securityMode: "jwt",
            authBootstrapping: false,
            authUser: { userId: 11, username: "jwt-admin", primaryRole: "ROLE_CENTER_ADMIN", roles: ["ROLE_CENTER_ADMIN"] }
          }}
        >
          <MemberListSection />
        </AuthStateProvider>
      </QueryClientProvider>
    );

    expect(secondLoadMembers).toHaveBeenCalledTimes(1);
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
        memo: null
      };
      return true;
    });

    renderWithAuth();

    fireEvent.click(screen.getByText("김민수"));
    await waitFor(() => expect(selectMemberMock).toHaveBeenCalledWith(101));

    // antd Modal title uses Space+icon, so accessible name includes icon aria-label
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
        memo: null
      };
      return true;
    });

    renderWithAuth();

    fireEvent.click(screen.getByRole("button", { name: "회원권" }));
    await waitFor(() => expect(selectMemberMock).toHaveBeenCalledWith(101));

    expect(navigateMock).toHaveBeenCalledWith("/memberships");
    expect(screen.queryByRole("dialog", { name: "선택 회원 정보" })).toBeNull();
  });

  it("shows member create entry for admin and hides it for trainer", () => {
    const { rerender } = renderWithAuth();

    // antd Button with icon renders accessible name as "plus회원 등록" (icon aria-label + text)
    expect(screen.getByRole("button", { name: /회원 등록/ })).toBeTruthy();

    rerender(
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            securityMode: "jwt",
            authBootstrapping: false,
            authUser: { userId: 41, username: "jwt-trainer", primaryRole: "ROLE_TRAINER", roles: ["ROLE_TRAINER"] }
          }}
        >
          <MemberListSection />
        </AuthStateProvider>
      </QueryClientProvider>
    );

    expect(screen.queryByRole("button", { name: /회원 등록/ })).toBeNull();
  });

  it("clears memberStatus together with the other filters on reset", () => {
    renderWithAuth();

    // antd Select does not associate the label via htmlFor, so click the Reset button directly
    fireEvent.click(screen.getByRole("button", { name: /초기화/ }));

    expect(currentLoadMembers).toHaveBeenLastCalledWith({
      name: "",
      phone: "",
      memberStatus: "",
      membershipOperationalStatus: "",
      dateFrom: "",
      dateTo: ""
    });
  });
});
