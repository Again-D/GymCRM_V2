import { beforeEach, describe, expect, it } from "vitest";

import {
  createMockMember,
  createMockMembership,
  createMockTrainerSettlementConfirm,
  downloadMockSalesSettlementReport,
  downloadMockTrainerSettlementDocument,
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
      productId: 2,
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
      "/api/v1/settlements/sales-report?startDate=2026-03-01&endDate=2026-03-31&paymentMethod=CARD&trendGranularity=DAILY"
    )?.data as SettlementReport;

    expect(report.totalGrossSales).toBeGreaterThan(0);
    expect(report.rows.every((row) => row.paymentMethod === "CARD")).toBe(true);
    expect(report.rows.some((row) => row.productName.includes("PT"))).toBe(true);
    expect(report.trend.length).toBeGreaterThan(0);
  });

  it("returns dashboard and recent adjustments mock responses", () => {
    const dashboard = getMockResponse(
      "/api/v1/settlements/sales-dashboard?baseDate=2026-03-11&expiringWithinDays=7"
    )?.data as { refundCount: number; monthNetSales: number };
    const recentAdjustments = getMockResponse(
      "/api/v1/settlements/sales-report/recent-adjustments?startDate=2026-03-01&endDate=2026-03-31&limit=5"
    )?.data as Array<{ adjustmentType: string }>;

    expect(dashboard.monthNetSales).toBeGreaterThan(0);
    expect(dashboard.refundCount).toBeGreaterThan(0);
    expect(recentAdjustments.length).toBeGreaterThan(0);
    expect(recentAdjustments.every((row) => row.adjustmentType === "REFUND")).toBe(true);
  });

  it("preserves expiringWithinDays=0 for the dashboard window", () => {
    const dashboard = getMockResponse(
      "/api/v1/settlements/sales-dashboard?baseDate=2026-03-11&expiringWithinDays=0"
    )?.data as { expiringWithinDays: number; expiringMemberCount: number };

    expect(dashboard.expiringWithinDays).toBe(0);
    expect(dashboard.expiringMemberCount).toBe(0);
  });

  it("groups weekly settlement trends by Seoul business week regardless of host timezone", () => {
    const report = getMockResponse(
      "/api/v1/settlements/sales-report?startDate=2026-03-01&endDate=2026-03-31&paymentMethod=CARD&productKeyword=PT&trendGranularity=WEEKLY"
    )?.data as SettlementReport;

    expect(report.trend.length).toBeGreaterThan(0);
    expect(report.trend.every((point) => point.bucketLabel.endsWith("주간"))).toBe(true);
    expect(report.trend.some((point) => point.bucketStartDate === "2026-03-09")).toBe(true);
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

  it("filters members by memberStatus in mock responses", () => {
    const activeMembers = getMockResponse("/api/v1/members?memberStatus=ACTIVE")?.data as MemberSummary[];
    const inactiveMembers = getMockResponse("/api/v1/members?memberStatus=INACTIVE")?.data as MemberSummary[];

    expect(activeMembers.length).toBeGreaterThan(0);
    expect(activeMembers.every((member) => member.memberStatus === "ACTIVE")).toBe(true);
    expect(inactiveMembers.length).toBeGreaterThan(0);
    expect(inactiveMembers.every((member) => member.memberStatus === "INACTIVE")).toBe(true);
  });

  it("filters reservation list responses by memberId and status", () => {
    const confirmedReservations = getMockResponse(
      "/api/v1/reservations?memberId=101&status=CONFIRMED",
    )?.data as Array<{ reservationId: number; membershipId: number; reservationStatus: string }>;
    const cancelledReservations = getMockResponse(
      "/api/v1/reservations?memberId=101&status=CANCELLED",
    )?.data as Array<{ reservationId: number; membershipId: number; reservationStatus: string }>;

    expect(confirmedReservations).toHaveLength(1);
    expect(confirmedReservations[0]?.reservationId).toBe(5001);
    expect(confirmedReservations[0]?.reservationStatus).toBe("CONFIRMED");
    expect(cancelledReservations).toHaveLength(0);
  });

  it("preserves confirmed trainer settlement snapshots for previously confirmed months", async () => {
    await createMockTrainerSettlementConfirm({
      settlementMonth: "2026-03",
      sessionUnitPrice: 50000
    });
    await createMockTrainerSettlementConfirm({
      settlementMonth: "2026-04",
      sessionUnitPrice: 60000
    });

    const marchReport = getMockResponse(
      "/api/v1/settlements/trainer-payroll?settlementMonth=2026-03&sessionUnitPrice=50000"
    )?.data as { settlementStatus: string; rows: Array<{ sessionUnitPrice: number }> };
    const aprilReport = getMockResponse(
      "/api/v1/settlements/trainer-payroll?settlementMonth=2026-04&sessionUnitPrice=60000"
    )?.data as { settlementStatus: string; rows: Array<{ sessionUnitPrice: number }> };

    expect(marchReport.settlementStatus).toBe("CONFIRMED");
    expect(marchReport.rows.every((row) => row.sessionUnitPrice === 50000)).toBe(true);
    expect(aprilReport.settlementStatus).toBe("CONFIRMED");
    expect(aprilReport.rows.every((row) => row.sessionUnitPrice === 60000)).toBe(true);
  });

  it("exports a confirmed trainer settlement document without clearing other months", async () => {
    await createMockTrainerSettlementConfirm({
      settlementMonth: "2026-03",
      sessionUnitPrice: 50000
    });

    const result = await downloadMockTrainerSettlementDocument("2026-03");

    expect(result.ok).toBe(true);
    expect(result.fileName).toBe("trainer-settlement-2026-03.pdf");
    expect(result.content).toContain("%PDF-1.4");
  });

  it("exports a sales settlement report with xlsx filename contract", async () => {
    const result = await downloadMockSalesSettlementReport({
      startDate: "2026-03-01",
      endDate: "2026-03-31",
      paymentMethod: "CARD",
      productKeyword: "PT",
      trendGranularity: "DAILY"
    });

    expect(result.ok).toBe(true);
    expect(result.fileName).toBe("sales-report-2026-03-01-to-2026-03-31.xlsx");
    expect(result.content[0]).toBe(0x50);
    expect(result.content[1]).toBe(0x4b);
  });

  it("returns trainer monthly pt summary for the requested trainer user", () => {
    const summary = getMockResponse(
      "/api/v1/settlements/trainer-payroll/my-summary?settlementMonth=2026-03&trainerUserId=41"
    )?.data as { trainerUserId: number; trainerName: string; completedClassCount: number };

    expect(summary.trainerUserId).toBe(41);
    expect(summary.trainerName).toBe("정트레이너");
    expect(summary.completedClassCount).toBeGreaterThan(0);
  });

});
