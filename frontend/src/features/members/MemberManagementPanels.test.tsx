import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemberManagementPanels } from "./MemberManagementPanels";

function buildMembers(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    memberId: index + 1,
    memberName: `회원 ${index + 1}`,
    phone: `010-0000-${String(index + 1).padStart(4, "0")}`,
    memberStatus: "ACTIVE" as const,
    joinDate: "2026-03-11",
    membershipOperationalStatus: "정상" as const,
    membershipExpiryDate: "2026-04-11",
    remainingPtCount: 10
  }));
}

function renderPanel(overrides: Partial<Parameters<typeof MemberManagementPanels>[0]> = {}) {
  return render(
    <MemberManagementPanels
      startCreateMember={() => {}}
      memberSearchName=""
      setMemberSearchName={() => {}}
      memberSearchPhone=""
      setMemberSearchPhone={() => {}}
      memberTrainerFilter=""
      setMemberTrainerFilter={() => {}}
      memberProductFilter=""
      setMemberProductFilter={() => {}}
      memberMembershipStatusFilter=""
      setMemberMembershipStatusFilter={() => {}}
      memberDateFilter={{ presetRange: "", dateFrom: "", dateTo: "" }}
      applyMemberDatePreset={() => {}}
      setMemberDateFrom={() => {}}
      setMemberDateTo={() => {}}
      trainerOptions={[]}
      productOptions={[]}
      trainerFilterDisabled={false}
      loadMembers={vi.fn().mockResolvedValue(undefined)}
      membersLoading={false}
      memberPanelMessage={null}
      memberPanelError={null}
      members={buildMembers(25)}
      selectedMemberId={null}
      selectMember={vi.fn().mockResolvedValue(undefined)}
      openMemberEditor={vi.fn().mockResolvedValue(undefined)}
      openMembershipOperationsForMember={vi.fn().mockResolvedValue(undefined)}
      openReservationManagementForMember={vi.fn().mockResolvedValue(undefined)}
      memberFormMode="create"
      memberFormOpen={false}
      closeMemberForm={() => {}}
      handleMemberSubmit={(event) => event.preventDefault()}
      memberFormMessage={null}
      memberFormError={null}
      memberForm={{
        memberName: "",
        phone: "",
        email: "",
        gender: "",
        birthDate: "",
        memberStatus: "ACTIVE",
        joinDate: "2026-03-11",
        consentSms: true,
        consentMarketing: false,
        memo: ""
      }}
      setMemberForm={() => {}}
      memberFormSubmitting={false}
      {...overrides}
    />
  );
}

describe("MemberManagementPanels pagination", () => {
  it("resets to the first page when filter props change", () => {
    const view = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(screen.queryByText("회원 21")).not.toBeNull();
    expect(screen.queryByText("회원 1")).toBeNull();

    view.rerender(
      <MemberManagementPanels
        startCreateMember={() => {}}
        memberSearchName="kim"
        setMemberSearchName={() => {}}
        memberSearchPhone=""
        setMemberSearchPhone={() => {}}
        memberTrainerFilter=""
        setMemberTrainerFilter={() => {}}
        memberProductFilter=""
        setMemberProductFilter={() => {}}
        memberMembershipStatusFilter=""
        setMemberMembershipStatusFilter={() => {}}
        memberDateFilter={{ presetRange: "", dateFrom: "", dateTo: "" }}
        applyMemberDatePreset={() => {}}
        setMemberDateFrom={() => {}}
        setMemberDateTo={() => {}}
        trainerOptions={[]}
        productOptions={[]}
        trainerFilterDisabled={false}
        loadMembers={vi.fn().mockResolvedValue(undefined)}
        membersLoading={false}
        memberPanelMessage={null}
        memberPanelError={null}
        members={buildMembers(25)}
        selectedMemberId={null}
        selectMember={vi.fn().mockResolvedValue(undefined)}
        openMemberEditor={vi.fn().mockResolvedValue(undefined)}
        openMembershipOperationsForMember={vi.fn().mockResolvedValue(undefined)}
        openReservationManagementForMember={vi.fn().mockResolvedValue(undefined)}
        memberFormMode="create"
        memberFormOpen={false}
        closeMemberForm={() => {}}
        handleMemberSubmit={(event) => event.preventDefault()}
        memberFormMessage={null}
        memberFormError={null}
        memberForm={{
          memberName: "",
          phone: "",
          email: "",
          gender: "",
          birthDate: "",
          memberStatus: "ACTIVE",
          joinDate: "2026-03-11",
          consentSms: true,
          consentMarketing: false,
          memo: ""
        }}
        setMemberForm={() => {}}
        memberFormSubmitting={false}
      />
    );

    expect(screen.queryByText("회원 1")).not.toBeNull();
    expect(screen.queryByText("회원 21")).toBeNull();
  });
});
