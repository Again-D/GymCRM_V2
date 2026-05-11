import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiPostMock = vi.fn();

vi.mock("../../../api/client", () => ({
  apiPost: (...args: unknown[]) => apiPostMock(...args),
}));

import { SelectedMemberSummaryCard } from "./SelectedMemberSummaryCard";

const useSelectedMemberStoreMock = vi.fn();

vi.mock("../modules/SelectedMemberContext", () => ({
  useSelectedMemberStore: () => useSelectedMemberStoreMock()
}));

describe("SelectedMemberSummaryCard", () => {
  beforeEach(() => {
    useSelectedMemberStoreMock.mockReset();
    apiPostMock.mockReset();
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
    vi.restoreAllMocks();
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
        memo: null,
        emergencyContactName: "김보호자",
        emergencyContactPhone: "010-1111-2222",
        emergencyContactRelationship: "부모",
        memberQrPath: null
      },
      selectedMemberError: null,
      selectedMemberLoading: false,
      clearSelectedMember: vi.fn()
    });

    render(<SelectedMemberSummaryCard />);

    expect(screen.getByText("회원 상태")).toBeTruthy();
    expect(screen.getByText("비상연락처")).toBeTruthy();
    expect(screen.getByText("QR 링크")).toBeTruthy();
    expect(screen.getByRole("button", { name: "회원 QR 열기" })).toBeTruthy();
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
        memo: null,
        emergencyContactName: "김보호자",
        emergencyContactPhone: "010-1111-2222",
        emergencyContactRelationship: "부모",
        memberQrPath: null
      },
      selectedMemberError: null,
      selectedMemberLoading: false,
      clearSelectedMember: vi.fn()
    });

    render(<SelectedMemberSummaryCard surface="plain" />);

    expect(screen.queryByText("선택된 회원 정보")).toBeNull();
    expect(screen.getByText("회원 상태")).toBeTruthy();
    expect(screen.getByText("비상연락처")).toBeTruthy();
    expect(screen.getByRole("button", { name: "회원 QR 열기" })).toBeTruthy();
  });

  it("opens the explicit QR link when requested", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    apiPostMock.mockResolvedValue({
      data: {
        bootstrapToken: "bootstrap-token",
        memberId: 17,
        memberName: "김회원",
        bootstrapExpiresAt: "2026-03-01T00:00:00Z",
        memberQrPath: "/member-qr?token=mock-member-token-17",
      },
    });

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
        memo: null,
        emergencyContactName: "김보호자",
        emergencyContactPhone: "010-1111-2222",
        emergencyContactRelationship: "부모",
        memberQrPath: null
      },
      selectedMemberError: null,
      selectedMemberLoading: false,
      clearSelectedMember: vi.fn()
    });

    render(<SelectedMemberSummaryCard />);

    fireEvent.click(await screen.findByRole("button", { name: "회원 QR 열기" }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith("/api/v1/access/qr/member-link", { memberId: 17 });
      expect(openSpy).toHaveBeenCalledWith(
        "/member-qr?token=mock-member-token-17",
        "_blank",
        "noopener,noreferrer",
      );
    });
  });
});
