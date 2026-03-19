import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SelectedMemberSummaryCard } from "./SelectedMemberSummaryCard";

const useSelectedMemberStoreMock = vi.fn();

vi.mock("../modules/SelectedMemberContext", () => ({
  useSelectedMemberStore: () => useSelectedMemberStoreMock()
}));

describe("SelectedMemberSummaryCard", () => {
  beforeEach(() => {
    useSelectedMemberStoreMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

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
      clearSelectedMember: vi.fn()
    });

    render(<SelectedMemberSummaryCard />);

    expect(screen.getByText("회원 상태")).toBeTruthy();
    expect(screen.getAllByText("활성").length).toBeGreaterThan(0);
    expect(screen.queryByText("회원권 상태")).toBeNull();
  });

  it("renders plain content without the panel title for modal usage", () => {
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
      clearSelectedMember: vi.fn()
    });

    const { container } = render(<SelectedMemberSummaryCard surface="plain" />);

    expect(container.querySelector("aside.panel-card")).toBeNull();
    expect(screen.getByText("회원 상태")).toBeTruthy();
  });
});
