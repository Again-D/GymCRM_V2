import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("../../../shared/ui/PaginationControls", () => ({
  PaginationControls: () => <div>pagination</div>
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

describe("MemberListSection", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    clearSelectedMemberMock.mockClear();
    currentLoadMembers = vi.fn();
    currentSelectedMemberId = null;
    currentSelectedMember = null;
    selectMemberMock = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders membership operational status in Korean", () => {
    render(<MemberListSection />);

    expect(screen.getAllByText("홀딩중").length).toBeGreaterThan(0);
    expect(screen.queryByText("HOLDING")).toBeNull();
  });

  it("reruns bootstrap loading when loadMembers reference changes", () => {
    const firstLoadMembers = vi.fn();
    currentLoadMembers = firstLoadMembers;

    const { rerender } = render(<MemberListSection />);

    expect(firstLoadMembers).toHaveBeenCalledTimes(1);

    const secondLoadMembers = vi.fn();
    currentLoadMembers = secondLoadMembers;
    rerender(<MemberListSection />);

    expect(secondLoadMembers).toHaveBeenCalledTimes(1);
  });

  it("opens the selected member modal after a successful select", async () => {
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

    const { rerender } = render(<MemberListSection />);

    fireEvent.click(screen.getAllByRole("button", { name: "선택" })[0]);
    await waitFor(() => expect(selectMemberMock).toHaveBeenCalledWith(101));

    rerender(<MemberListSection />);

    expect(screen.getByRole("dialog", { name: "김민수 회원 정보" })).toBeTruthy();
    expect(screen.getByText("회원 상태")).toBeTruthy();
  });

  it("does not open the selected member modal when selectMember fails", async () => {
    selectMemberMock = vi.fn(async () => false);

    render(<MemberListSection />);

    fireEvent.click(screen.getAllByRole("button", { name: "선택" })[0]);
    await waitFor(() => expect(selectMemberMock).toHaveBeenCalledWith(101));

    expect(screen.queryByRole("dialog", { name: "선택 회원 정보" })).toBeNull();
  });
});
