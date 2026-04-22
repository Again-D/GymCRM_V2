import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { apiPatch, apiPost, setMockApiModeForTests, setMockAuthSessionContext } from "./client";
import {
  createMockMember,
  createMockMembership,
  createMockUserAccount,
  createMockTrainerSettlementConfirm,
  downloadMockSalesSettlementReport,
  downloadMockTrainerSettlementDocument,
  getMockTrainerDetail,
  getMockResponse,
  patchMockMembership,
  processMockCrmQueue,
  resetMockData,
  triggerMockCrmExpiryReminder,
  updateMockTrainer,
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
    setMockApiModeForTests(true);
  });

  afterEach(() => {
    setMockAuthSessionContext(null);
    setMockApiModeForTests(null);
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

  it("returns a failed envelope for duplicate locker batch registration in mock mode", () => {
    const response = getMockResponse(
      "/api/v1/lockers/batch",
      "POST",
      {
        items: [
          {
            lockerZone: "qa-test",
            lockerNumber: 1,
            lockerGrade: "STANDARD",
            lockerStatus: "AVAILABLE",
            memo: ""
          },
          {
            lockerZone: "qa-test",
            lockerNumber: 1,
            lockerGrade: "PREMIUM",
            lockerStatus: "AVAILABLE",
            memo: ""
          }
        ]
      },
    );

    expect(response?.success).toBe(false);
    expect(response?.message).toContain("중복 라커 코드");
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

  it("syncs trainer records when a trainer account is created through user-account helpers", () => {
    const created = createMockUserAccount({
      centerId: 1,
      loginId: "trainer-c",
      userName: "박트레이너",
      roleCode: "ROLE_TRAINER",
      temporaryPassword: "Password123!",
    });
    expect(created.passwordChangeRequired).toBe(true);

    const trainerDetail = getMockTrainerDetail(created.userId);
    expect(trainerDetail).not.toBeNull();
    expect(trainerDetail?.ptSessionUnitPrice).toBeNull();
    expect(trainerDetail?.gxSessionUnitPrice).toBeNull();

    const updated = updateMockTrainer(created.userId, {
      loginId: "trainer-c",
      userName: "박트레이너",
      phone: "010-5555-7777",
      ptSessionUnitPrice: 70000,
      gxSessionUnitPrice: null,
    });

    expect(updated?.ptSessionUnitPrice).toBe(70000);
    expect(updated?.gxSessionUnitPrice).toBeNull();
    expect(getMockTrainerDetail(created.userId)?.gxSessionUnitPrice).toBeNull();
  });

  it("creates accounts and rejects duplicate loginIds through the mock auth endpoint", async () => {
    setMockAuthSessionContext({
      userId: 99,
      centerId: 1,
      loginId: "admin-user",
      userName: "관리자",
      primaryRole: "ROLE_ADMIN",
      roles: ["ROLE_ADMIN"],
      passwordChangeRequired: false,
      userStatus: "ACTIVE",
      currentPassword: "Admin-1234!",
    });

    const firstResponse = await apiPost<{
      userId: number;
      passwordChangeRequired: boolean;
      roleCode: string;
    }>("/api/v1/auth/users", {
      loginId: "endpoint-manager",
      userName: "엔드포인트 관리자",
      roleCode: "ROLE_MANAGER",
      temporaryPassword: "Temp-pass-1234!",
    });

    expect(firstResponse.data.passwordChangeRequired).toBe(true);

    const usersAfterCreate = getMockResponse("/api/v1/auth/users")?.data as {
      items: Array<{ loginId: string; passwordChangeRequired: boolean }>;
    };
    expect(
      usersAfterCreate.items.find((user) => user.loginId === "endpoint-manager")?.passwordChangeRequired,
    ).toBe(true);

    await expect(
      apiPost("/api/v1/auth/users", {
        loginId: "endpoint-manager",
        userName: "중복 관리자",
        roleCode: "ROLE_MANAGER",
        temporaryPassword: "Temp-pass-1234!",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
  });

  it("resets a current-center account and changes the active session password through the mock auth endpoint", async () => {
    setMockAuthSessionContext({
      userId: 1,
      centerId: 1,
      loginId: "center-admin",
      userName: "센터 관리자",
      primaryRole: "ROLE_ADMIN",
      roles: ["ROLE_ADMIN"],
      passwordChangeRequired: true,
      userStatus: "ACTIVE",
      currentPassword: "Admin-1234!",
    });

    const resetResponse = await apiPost<{
      userId: number;
      passwordChangeRequired: boolean;
      accessRevokedAfter: string | null;
    }>("/api/v1/auth/users/2/password-reset", {
      temporaryPassword: "Reset-pass-1234!",
    });

    expect(resetResponse.data.passwordChangeRequired).toBe(true);
    expect(resetResponse.data.accessRevokedAfter).not.toBeNull();

    const usersAfterReset = getMockResponse("/api/v1/auth/users")?.data as {
      items: Array<{ userId: number; passwordChangeRequired: boolean; accessRevokedAfter: string | null }>;
    };
    expect(usersAfterReset.items.find((user) => user.userId === 2)?.passwordChangeRequired).toBe(true);
    expect(usersAfterReset.items.find((user) => user.userId === 2)?.accessRevokedAfter).not.toBeNull();

    const forcedChangeResponse = await apiPatch<{
      userId: number;
      passwordChangeRequired: boolean;
    }>("/api/v1/auth/password", {
      newPassword: "New-pass-1234!",
      newPasswordConfirmation: "New-pass-1234!",
    });

    expect(forcedChangeResponse.data.passwordChangeRequired).toBe(false);

    const usersAfterChange = getMockResponse("/api/v1/auth/users")?.data as {
      items: Array<{ userId: number; passwordChangeRequired: boolean }>;
    };
    expect(usersAfterChange.items.find((user) => user.userId === 1)?.passwordChangeRequired).toBe(false);

    await expect(
      apiPatch("/api/v1/auth/password", {
        currentPassword: "Admin-1234!",
        newPassword: "Newest-pass-1234!",
        newPasswordConfirmation: "Newest-pass-1234!",
      }),
    ).rejects.toMatchObject({
      status: 401,
      code: "AUTHENTICATION_FAILED",
    });

    const normalChangeResponse = await apiPatch<{
      userId: number;
      passwordChangeRequired: boolean;
    }>("/api/v1/auth/password", {
      currentPassword: "New-pass-1234!",
      newPassword: "Newest-pass-1234!",
      newPasswordConfirmation: "Newest-pass-1234!",
    });

    expect(normalChangeResponse.data.passwordChangeRequired).toBe(false);
  });

  it("rejects password resets for users outside the current center", async () => {
    setMockAuthSessionContext({
      userId: 99,
      centerId: 1,
      loginId: "admin-user",
      userName: "관리자",
      primaryRole: "ROLE_ADMIN",
      roles: ["ROLE_ADMIN"],
      passwordChangeRequired: false,
      userStatus: "ACTIVE",
      currentPassword: "Admin-1234!",
    });

    const externalUser = createMockUserAccount({
      centerId: 2,
      loginId: "external-trainer",
      userName: "외부 트레이너",
      roleCode: "ROLE_TRAINER",
      temporaryPassword: "Temp-pass-1234!",
    });

    await expect(
      apiPost(`/api/v1/auth/users/${externalUser.userId}/password-reset`, {
        temporaryPassword: "Reset-pass-1234!",
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: "NOT_FOUND",
    });
  });

  it("marks settlement preview with a rate warning when trainer rates are missing", () => {
    const preview = getMockResponse(
      "/api/v1/settlements/preview?trainerId=42&settlementMonth=2026-03"
    )?.data as {
      summary: { hasRateWarnings: boolean; totalAmount: number | null };
      rows: Array<{ hasRateWarning: boolean; rateWarningMessage: string | null; gxRatePerSession: number | null }>;
      conflict: { createAllowed: boolean };
    };

    expect(preview.summary.hasRateWarnings).toBe(true);
    expect(preview.summary.totalAmount).toBeNull();
    expect(preview.rows[0]?.hasRateWarning).toBe(true);
    expect(preview.rows[0]?.gxRatePerSession).toBeNull();
    expect(preview.rows[0]?.rateWarningMessage).toContain("트레이너 관리");
    expect(preview.conflict.createAllowed).toBe(false);
  });

});
