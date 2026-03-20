import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import TrainersPage from "./TrainersPage";

describe("TrainersPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/v1/trainers/")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              data: {
                userId: 41,
                centerId: 1,
                displayName: "정트레이너",
                loginId: "trainer-a",
                userStatus: "ACTIVE",
                phone: "010-1111-2222",
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
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                userId: 41,
                centerId: 1,
                displayName: "정트레이너",
                userStatus: "ACTIVE",
                phone: "010-1111-2222",
                assignedMemberCount: 1,
                todayConfirmedReservationCount: 1,
              },
            ],
            message: "ok",
            timestamp: "2026-03-20T00:00:00Z",
            traceId: "trace-trainers",
          }),
        };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps desk users in read-only mode for trainer management", async () => {
    setMockApiModeForTests(false);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 21,
            username: "desk-user",
            role: "ROLE_DESK",
          },
        }}
      >
        <TrainersPage />
      </AuthStateProvider>,
    );

    expect(await screen.findByRole("heading", { name: "트레이너 관리" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "트레이너 등록" })).toBeNull();
    expect(screen.getByText("조회 전용 모드")).toBeTruthy();
  });

  it("shows unsupported note for trainer role in live mode", async () => {
    setMockApiModeForTests(false);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "trainer-a",
            role: "ROLE_TRAINER",
          },
        }}
      >
        <TrainersPage />
      </AuthStateProvider>,
    );

    expect(await screen.findByRole("heading", { name: "트레이너 관리" })).toBeTruthy();
    expect(
      screen.getByText("현재 권한에서는 트레이너 관리 화면에 접근할 수 없습니다."),
    ).toBeTruthy();
  });
});
