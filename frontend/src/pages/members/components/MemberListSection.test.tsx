import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MemberListSection } from "./MemberListSection";

const navigateMock = vi.fn();
let currentLoadMembers = vi.fn();

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
    selectedMemberId: null,
    selectMember: vi.fn()
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
  it("renders membership operational status in Korean", () => {
    currentLoadMembers = vi.fn();

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
});
