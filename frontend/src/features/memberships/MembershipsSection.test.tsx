import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MembershipsSection } from "./MembershipsSection";
import { SelectedMemberOwnerProvider } from "../members/useSelectedMemberOwner";

describe("MembershipsSection", () => {
  it("shows selected member summary from the members-domain owner", () => {
    render(
      <SelectedMemberOwnerProvider
        value={{
          selectedMemberId: 12,
          selectedMember: {
            memberId: 12,
            centerId: 1,
            memberName: "김회원",
            phone: "010-1212-1212",
            email: null,
            gender: null,
            birthDate: null,
            memberStatus: "ACTIVE",
            joinDate: "2026-03-01",
            consentSms: true,
            consentMarketing: false,
            memo: null
          },
          selectedMemberLoading: false,
          selectMember: vi.fn(),
          clearSelectedMember: vi.fn(),
          replaceSelectedMember: vi.fn()
        }}
      >
        <MembershipsSection loadWorkspaceMembers={vi.fn().mockResolvedValue([])} onGoMembers={vi.fn()}>
          <div>MEMBERSHIP_PANEL</div>
        </MembershipsSection>
      </SelectedMemberOwnerProvider>
    );

    expect(screen.getByText("선택 회원 요약")).toBeTruthy();
    expect(screen.getByText("김회원")).toBeTruthy();
    expect(screen.getByText("MEMBERSHIP_PANEL")).toBeTruthy();
  });

  it("uses the selected-member owner when picking a member", async () => {
    const selectMember = vi.fn().mockResolvedValue({
      memberId: 21,
      centerId: 1,
      memberName: "새 회원",
      phone: "010-2121-2121",
      email: null,
      gender: null,
      birthDate: null,
      memberStatus: "ACTIVE",
      joinDate: "2026-03-01",
      consentSms: true,
      consentMarketing: false,
      memo: null
    });

    render(
      <SelectedMemberOwnerProvider
        value={{
          selectedMemberId: null,
          selectedMember: null,
          selectedMemberLoading: false,
          selectMember,
          clearSelectedMember: vi.fn(),
          replaceSelectedMember: vi.fn()
        }}
      >
        <MembershipsSection
          loadWorkspaceMembers={vi.fn().mockResolvedValue([
            { memberId: 21, memberName: "새 회원", phone: "010-2121-2121", memberStatus: "ACTIVE" }
          ])}
          onGoMembers={vi.fn()}
        >
          <div>MEMBERSHIP_PANEL</div>
        </MembershipsSection>
      </SelectedMemberOwnerProvider>
    );

    fireEvent.change(screen.getByLabelText("회원 검색"), {
      target: { value: "새 회원" }
    });

    const button = await screen.findByRole("button", { name: /새 회원/ });
    fireEvent.click(button);

    await waitFor(() => {
      expect(selectMember).toHaveBeenCalledWith(21);
    });
  });
});
