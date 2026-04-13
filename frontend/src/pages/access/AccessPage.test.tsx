import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import { resetMockData } from "../../api/mockData";
import { SelectedMemberProvider } from "../members/modules/SelectedMemberContext";
import AccessPage from "./AccessPage";
import { FoundationProviders } from "../../app/providers";
import { appQueryClient } from "../../app/queryClient";
import { selectedMemberStore } from "../../app/selectedMemberStore";

describe("AccessPage", () => {
  beforeEach(() => {
    appQueryClient.clear();
    setMockApiModeForTests(true);
    resetMockData();
    selectedMemberStore.getState().reset();
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
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
    vi.useRealTimers();
    cleanup();
    vi.unstubAllGlobals();
  });

  it("stays usable without selected member context", async () => {
    render(
      <FoundationProviders>
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "출입 모니터링" })).toBeTruthy();
    expect(screen.getByText("현재 입장 회원")).toBeTruthy();
    expect(screen.getByText("출입 이력")).toBeTruthy();
    expect(screen.getByText("회원 디렉터리")).toBeTruthy();
  }, 10000);

  it("shows trainer unsupported note in live mode", async () => {
    setMockApiModeForTests(false);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "jwt-trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"]
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "출입 모니터링" })).toBeTruthy();
    expect(screen.getByText(/현재 관리자 권한이 없어/)).toBeTruthy();
    expect(screen.getByText(/데모 또는 실제 관리자 세션으로 전환이 필요합니다/)).toBeTruthy();
    expect(screen.getByText("현재 입장 중인 회원이 없습니다.")).toBeTruthy();
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
                membershipOperationalStatus: "ACTIVE",
                membershipExpiryDate: "2026-06-30"
              }
            ],
            message: "ok",
            timestamp: "2026-03-13T00:00:00Z",
            traceId: "trace-members"
          })
        };
      }

      const defaultPresence = {
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
      };

      if (input === "/api/v1/access/presence") {
        return {
          ok: true,
          json: async () => defaultPresence
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
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 11,
            username: "jwt-admin",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"]
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    expect(await screen.findByText("김민수")).toBeTruthy();

    rerender(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "jwt-trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"]
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    expect(await screen.findByText(/현재 관리자 권한이 없어/)).toBeTruthy();
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
            }
          })
        };
      }

      if (input.startsWith("/api/v1/access/events")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: []
          })
        };
      }

      throw new Error(`Unexpected request: ${input}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 11,
            username: "jwt-admin",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"]
          }
        }}
      >
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    expect(screen.getByRole("heading", { name: "출입 모니터링" })).toBeTruthy();
    await vi.runAllTimersAsync();

    const searchInput = screen.getByPlaceholderText("회원 이름 또는 전화번호 뒷자리 검색");
    fireEvent.change(searchInput, { target: { value: "김" } });
    fireEvent.change(searchInput, { target: { value: "김민" } });

    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/v1/members")).length).toBe(1);

    await vi.advanceTimersByTimeAsync(249);
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/v1/members")).length).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await Promise.resolve();

    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/v1/members")).length).toBe(2);
  }, 15000);
});
