import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SelectedMemberSummaryCard } from "./SelectedMemberSummaryCard";

const clearSelectedMember = vi.fn();
const useSelectedMemberStoreMock = vi.fn();

vi.mock("../modules/SelectedMemberContext", () => ({
  useSelectedMemberStore: () => useSelectedMemberStoreMock()
}));

describe("SelectedMemberSummaryCard", () => {
  it("renders member state with a correct label", () => {
    useSelectedMemberStoreMock.mockReturnValue({
      selectedMember: {
        memberId: 17,
        centerId: 1,
        memberName: "김회원",
        phone: "010-1234-5678",
        email: null,
        gender: null,
        birthDate: null,
        memberStatus: "ACTIVE",
        joinDate: "2026-03-01",
        consentSms: true,
        consentMarketing: false,
        memo: null
      },
      selectedMemberError: null,
      selectedMemberLoading: false,
      clearSelectedMember
    });

    render(<SelectedMemberSummaryCard />);

    expect(screen.getByText("회원 상태")).toBeTruthy();
    expect(screen.getAllByText("활성").length).toBeGreaterThan(0);
    expect(screen.queryByText("회원권 상태")).toBeNull();
  });
});
