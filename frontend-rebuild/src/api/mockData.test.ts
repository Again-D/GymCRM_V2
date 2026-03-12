import { beforeEach, describe, expect, it } from "vitest";

import { createMockMembership, getMockResponse, patchMockMembership, resetMockData } from "./mockData";
import type { MemberSummary } from "../pages/members/modules/types";
import type { ReservationTargetSummary } from "../pages/reservations/modules/useReservationTargetsQuery";

describe("mockData membership propagation", () => {
  beforeEach(() => {
    resetMockData();
  });

  it("adds a new membership to member summaries and reservation targets", () => {
    createMockMembership({
      memberId: 103,
      productNameSnapshot: "PT 10회권",
      productTypeSnapshot: "COUNT",
      startDate: "2026-03-12",
      endDate: "2026-06-30",
      remainingCount: 10
    });

    const members = getMockResponse("/api/v1/members")?.data as MemberSummary[];
    const reservationTargets = getMockResponse("/api/v1/reservations/targets")?.data as ReservationTargetSummary[];

    expect(members.find((member) => member.memberId === 103)?.membershipOperationalStatus).toBe("정상");
    expect(reservationTargets.map((target) => target.memberId)).toContain(103);
  });

  it("removes reservable target capacity when an active membership is put on hold", () => {
    patchMockMembership(102, 9011, (membership) => ({
      ...membership,
      membershipStatus: "HOLDING",
      activeHoldStatus: "ACTIVE"
    }));

    const members = getMockResponse("/api/v1/members")?.data as MemberSummary[];
    const reservationTargets = getMockResponse("/api/v1/reservations/targets")?.data as ReservationTargetSummary[];

    expect(members.find((member) => member.memberId === 102)?.membershipOperationalStatus).toBe("홀딩중");
    expect(reservationTargets.map((target) => target.memberId)).not.toContain(102);
  });
});
