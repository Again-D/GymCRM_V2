import { beforeEach, describe, expect, it } from "vitest";

import {
  createMockMember,
  createMockMembership,
  getMockResponse,
  patchMockMembership,
  processMockCrmQueue,
  resetMockData,
  triggerMockCrmExpiryReminder,
  updateMockMember
} from "./mockData";
import type { MemberSummary } from "../pages/members/modules/types";
import type { CrmHistoryRow } from "../pages/crm/modules/types";
import type { SettlementReport } from "../pages/settlements/modules/types";
import type { ReservationTargetSummary } from "../pages/reservations/modules/useReservationTargetsQuery";
import type { MemberDetail } from "../pages/members/modules/types";

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

  it("updates crm history through trigger and process actions", () => {
    triggerMockCrmExpiryReminder(3);

    const afterTrigger = getMockResponse("/api/v1/crm/messages?limit=100")?.data as { rows: CrmHistoryRow[] };
    expect(afterTrigger.rows[0]?.sendStatus).toBe("PENDING");

    processMockCrmQueue();

    const afterProcess = getMockResponse("/api/v1/crm/messages?limit=100")?.data as { rows: CrmHistoryRow[] };
    expect(afterProcess.rows.some((row) => row.sendStatus === "SENT")).toBe(true);
  });

  it("aggregates settlement report rows by product and payment method", () => {
    const report = getMockResponse(
      "/api/v1/settlements/sales-report?startDate=2026-03-01&endDate=2026-03-31&paymentMethod=CARD"
    )?.data as SettlementReport;

    expect(report.totalGrossSales).toBeGreaterThan(0);
    expect(report.rows.every((row) => row.paymentMethod === "CARD")).toBe(true);
    expect(report.rows.some((row) => row.productName.includes("PT"))).toBe(true);
  });

  it("creates and updates a member through mock helpers", () => {
    const created = createMockMember({
      memberName: "신규 모의회원",
      phone: "010-2345-6789",
      memberStatus: "ACTIVE",
      consentSms: true
    });

    const membersAfterCreate = getMockResponse("/api/v1/members")?.data as MemberSummary[];
    expect(membersAfterCreate.some((member) => member.memberId === created.memberId)).toBe(true);

    updateMockMember(created.memberId, (current) => ({
      ...current,
      memberStatus: "INACTIVE",
      memo: "비활성화 처리"
    }));

    const detail = getMockResponse(`/api/v1/members/${created.memberId}`)?.data as MemberDetail;
    expect(detail.memberStatus).toBe("INACTIVE");
    expect(detail.memo).toBe("비활성화 처리");
  });
});
