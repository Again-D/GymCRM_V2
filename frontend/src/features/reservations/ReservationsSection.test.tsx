import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReservationsSection } from "./ReservationsSection";
import { SelectedMemberOwnerProvider } from "../members/useSelectedMemberOwner";

describe("ReservationsSection", () => {
  it("selects reservation target through the members-domain owner", async () => {
    const selectMember = vi.fn().mockResolvedValue({
      memberId: 31,
      centerId: 1,
      memberName: "예약 회원",
      phone: "010-3131-3131",
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
        <ReservationsSection
          reservationTargets={[
            {
              memberId: 31,
              memberCode: "M-31",
              memberName: "예약 회원",
              phone: "010-3131-3131",
              reservableMembershipCount: 1,
              membershipExpiryDate: "2026-04-01",
              confirmedReservationCount: 0
            }
          ]}
          reservationTargetsLoading={false}
          reservationTargetsKeyword=""
          onReservationTargetsKeywordChange={vi.fn()}
          onReservationTargetsSearch={vi.fn()}
          selectedMemberReservationsCount={0}
          reservableMembershipsCount={0}
          reservableMemberships={[]}
          selectedMemberReservations={[]}
          reservationPanelMessage={null}
          reservationPanelError={null}
          onGoMembers={vi.fn()}
        >
          <div>RESERVATION_PANEL</div>
        </ReservationsSection>
      </SelectedMemberOwnerProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "선택" }));

    await waitFor(() => {
      expect(selectMember).toHaveBeenCalledWith(31);
    });
  });
});
