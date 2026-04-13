import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../api/client";
import { FoundationProviders } from "../../app/providers";
import { appQueryClient } from "../../app/queryClient";
import TrainersPage from "./TrainersPage";

describe("TrainersPage", () => {
  const fetchMock = vi.fn(async (input: string | URL | RequestInfo, init?: RequestInit) => {
    const url = String(input);

    if (url.includes("/api/v1/trainers/")) {
      if (url.includes("/availability")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              trainerUserId: 41,
              month: "2026-04",
              weeklyRules: [
                {
                  availabilityRuleId: 1,
                  dayOfWeek: 1,
                  startTime: "09:00:00",
                  endTime: "18:00:00",
                },
              ],
              exceptions: [
                {
                  availabilityExceptionId: 11,
                  exceptionDate: "2026-04-07",
                  exceptionType: "OFF",
                  overrideStartTime: null,
                  overrideEndTime: null,
                  memo: "세미나",
                },
              ],
              effectiveDays: [
                {
                  date: "2026-04-07",
                  source: "EXCEPTION_OFF",
                  availabilityStatus: "OFF",
                  startTime: null,
                  endTime: null,
                  memo: "세미나",
                },
              ],
            },
            message: "ok",
            timestamp: "2026-03-20T00:00:00Z",
            traceId: "trace-trainer-availability",
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: 41,
            centerId: 2,
            userName: "정트레이너",
            loginId: "trainer-a",
            userStatus: "ACTIVE",
            phone: "010-1111-2222",
            ptSessionUnitPrice: 50000,
            gxSessionUnitPrice: 30000,
            assignedMemberCount: 1,
            todayConfirmedReservationCount: 1,
            assignedMembers: [],
          },
          message: "ok",
          timestamp: "2026-03-20T00:00:00Z",
          traceId: "trace-trainer-detail",
        }),
      };
    }

    if (url.includes("/api/v1/trainers") && init?.method === "POST") {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: 52,
            centerId: body.centerId,
            userName: body.userName,
            loginId: body.loginId,
            userStatus: "ACTIVE",
            phone: body.phone ?? null,
            ptSessionUnitPrice: body.ptSessionUnitPrice ?? null,
            gxSessionUnitPrice: body.gxSessionUnitPrice ?? null,
            assignedMemberCount: 0,
            todayConfirmedReservationCount: 0,
            assignedMembers: [],
          },
          message: "트레이너 계정을 등록했습니다.",
          timestamp: "2026-03-20T00:00:00Z",
          traceId: "trace-trainer-create",
        }),
      };
    }

    if (url.includes("/api/v1/trainers/") && init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            userId: 41,
            centerId: 2,
            userName: body.userName,
            loginId: body.loginId,
            userStatus: "ACTIVE",
            phone: body.phone ?? null,
            ptSessionUnitPrice: body.ptSessionUnitPrice ?? null,
            gxSessionUnitPrice: body.gxSessionUnitPrice ?? null,
            assignedMemberCount: 1,
            todayConfirmedReservationCount: 1,
            assignedMembers: [],
          },
          message: "트레이너 정보를 수정했습니다.",
          timestamp: "2026-03-20T00:00:00Z",
          traceId: "trace-trainer-update",
        }),
      };
    }

    return {
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            userId: 41,
            centerId: 2,
            userName: "정트레이너",
            userStatus: "ACTIVE",
            phone: "010-1111-2222",
            ptSessionUnitPrice: 50000,
            gxSessionUnitPrice: 30000,
            assignedMemberCount: 1,
            todayConfirmedReservationCount: 1,
          },
        ],
        message: "ok",
        timestamp: "2026-03-20T00:00:00Z",
        traceId: "trace-trainers",
      }),
    };
  });

  beforeEach(() => {
    appQueryClient.clear();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
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
  });

  it("keeps desk users in read-only mode for trainer management", async () => {
    setMockApiModeForTests(false);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 21,
            centerId: 2,
            username: "desk-user",
            primaryRole: "ROLE_DESK",
            roles: ["ROLE_DESK"],
          },
        }}
      >
        <TrainersPage />
      </FoundationProviders>,
    );

    expect(await screen.findByRole("heading", { name: "트레이너 관리" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "트레이너 등록" })).toBeNull();
    expect(screen.getByText("조회 전용 모드")).toBeTruthy();
  }, 10000);

  it("shows readonly availability section in trainer detail", async () => {
    setMockApiModeForTests(false);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 21,
            centerId: 2,
            username: "desk-user",
            primaryRole: "ROLE_DESK",
            roles: ["ROLE_DESK"],
          },
        }}
      >
        <TrainersPage />
      </FoundationProviders>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "상세" }));

    expect(await screen.findByRole("heading", { name: "가용 스케줄" })).toBeTruthy();
    expect((await screen.findAllByText("세미나")).length).toBeGreaterThan(0);
    expect(await screen.findByText("PT 회당 단가")).toBeTruthy();
    expect(await screen.findByText("50,000원")).toBeTruthy();
    expect(await screen.findByText("GX 회당 단가")).toBeTruthy();
    expect(await screen.findByText("30,000원")).toBeTruthy();
  }, 10000);

  it("shows unsupported note for trainer role in live mode", async () => {
    setMockApiModeForTests(false);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            centerId: 2,
            username: "trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"],
          },
        }}
      >
        <TrainersPage />
      </FoundationProviders>,
    );

    expect(await screen.findByRole("heading", { name: "트레이너 관리" })).toBeTruthy();
    expect(
      screen.getByText("현재 권한에서는 트레이너 관리 화면에 접근할 수 없습니다."),
    ).toBeTruthy();
  });

  it("uses the actor center for non-super-admin live requests", async () => {
    setMockApiModeForTests(false);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 11,
            centerId: 2,
            username: "jwt-admin",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"],
          },
        }}
      >
        <TrainersPage />
      </FoundationProviders>,
    );

    expect(await screen.findByRole("heading", { name: "트레이너 관리" })).toBeTruthy();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/trainers?centerId=2"),
        expect.objectContaining({ method: "GET" }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "트레이너 등록" }));
    fireEvent.change(screen.getByPlaceholderText("아이디 입력"), {
      target: { value: "trainer-b" },
    });
    fireEvent.change(screen.getByPlaceholderText("최소 8자 이상"), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByPlaceholderText("트레이너 성명"), {
      target: { value: "김트레이너" },
    });
    fireEvent.change(screen.getByPlaceholderText("예: 50000"), {
      target: { value: "55000" },
    });
    fireEvent.change(screen.getByPlaceholderText("예: 30000"), {
      target: { value: "32000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/trainers"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            centerId: 2,
            loginId: "trainer-b",
            password: "Password123!",
            userName: "김트레이너",
            phone: null,
            ptSessionUnitPrice: 55000,
            gxSessionUnitPrice: 32000,
          }),
        }),
      );
    });
  }, 10000);

  it("preserves existing rates on edit submit when unchanged", async () => {
    setMockApiModeForTests(false);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 11,
            centerId: 2,
            username: "jwt-admin",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"],
          },
        }}
      >
        <TrainersPage />
      </FoundationProviders>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "수정" }));
    fireEvent.click(await screen.findByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/trainers/41"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            loginId: "trainer-a",
            userName: "정트레이너",
            phone: "010-1111-2222",
            ptSessionUnitPrice: 50000,
            gxSessionUnitPrice: 30000,
          }),
        }),
      );
    });
  }, 10000);
});
