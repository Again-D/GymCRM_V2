import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import { resetMockData } from "../../api/mockData";
import { SelectedMemberProvider } from "../members/modules/SelectedMemberContext";
import AccessPage from "./AccessPage";

describe("AccessPage", () => {
  beforeEach(() => {
    setMockApiModeForTests(true);
    resetMockData();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("stays usable without selected member context", async () => {
    render(
      <AuthStateProvider>
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "출입 관리 프로토타입" })).toBeTruthy();
    expect(screen.getByText("현재 입장중 회원")).toBeTruthy();
    expect(screen.getByText("최근 출입 이벤트")).toBeTruthy();
    expect(screen.getByText("회원을 선택하면 입장/퇴장 액션을 빠르게 실행할 수 있습니다.")).toBeTruthy();
  });

  it("shows trainer unsupported note in live mode", async () => {
    setMockApiModeForTests(false);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "jwt-trainer-a",
            role: "ROLE_TRAINER"
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "출입 관리 프로토타입" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "이 역할은 live 출입 관리 미지원" })).toBeTruthy();
    expect(screen.getByText("현재 역할에서는 live 입장 현황을 조회할 수 없습니다.")).toBeTruthy();
    expect(screen.getByText("현재 역할에서는 live 출입 이벤트를 조회할 수 없습니다.")).toBeTruthy();
  });

  it("clears previously loaded member search results when live access becomes unsupported", async () => {
    setMockApiModeForTests(false);

    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/v1/members")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                memberId: 101,
                memberName: "김민수",
                phone: "010-1234-5678",
                membershipOperationalStatus: "홀딩중",
                membershipExpiryDate: "2026-06-30"
              }
            ],
            message: "ok",
            timestamp: "2026-03-13T00:00:00Z",
            traceId: "trace-members"
          })
        };
      }

      if (input === "/api/v1/access/presence") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              openSessionCount: 0,
              todayEntryGrantedCount: 0,
              todayExitCount: 0,
              todayEntryDeniedCount: 0,
              openSessions: []
            },
            message: "ok",
            timestamp: "2026-03-13T00:00:00Z",
            traceId: "trace-presence"
          })
        };
      }

      if (input.startsWith("/api/v1/access/events")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            message: "ok",
            timestamp: "2026-03-13T00:00:00Z",
            traceId: "trace-events"
          })
        };
      }

      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 11,
            username: "jwt-admin",
            role: "ROLE_CENTER_ADMIN"
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(await screen.findByText("김민수")).toBeTruthy();

    rerender(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "jwt-trainer-a",
            role: "ROLE_TRAINER"
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "이 역할은 live 출입 관리 미지원" })).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByText("김민수")).toBeNull();
    });
  });

  it("debounces live member search input before issuing another members request", async () => {
    vi.useFakeTimers();
    setMockApiModeForTests(false);

    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/v1/members")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            message: "ok",
            timestamp: "2026-03-13T00:00:00Z",
            traceId: "trace-members"
          })
        };
      }

      if (input === "/api/v1/access/presence") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              openSessionCount: 0,
              todayEntryGrantedCount: 0,
              todayExitCount: 0,
              todayEntryDeniedCount: 0,
              openSessions: []
            },
            message: "ok",
            timestamp: "2026-03-13T00:00:00Z",
            traceId: "trace-presence"
          })
        };
      }

      if (input.startsWith("/api/v1/access/events")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            message: "ok",
            timestamp: "2026-03-13T00:00:00Z",
            traceId: "trace-events"
          })
        };
      }

      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 11,
            username: "jwt-admin",
            role: "ROLE_CENTER_ADMIN"
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(screen.getByRole("heading", { name: "출입 관리 프로토타입" })).toBeTruthy();
    await vi.runAllTimersAsync();

    const searchInput = screen.getByPlaceholderText("예: 김민수, 010-1234");
    fireEvent.change(searchInput, { target: { value: "김" } });
    fireEvent.change(searchInput, { target: { value: "김민" } });

    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/v1/members")).length).toBe(1);

    await vi.advanceTimersByTimeAsync(249);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/v1/members")).length).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/v1/members")).length).toBe(2);
  });
});
