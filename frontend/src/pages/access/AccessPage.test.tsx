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
      <AuthStateProvider>
        <SelectedMemberProvider>
          <AccessPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "Entry Monitoring" })).toBeTruthy();
    expect(screen.getByText("Active Sessions")).toBeTruthy();
    expect(screen.getByText("Access Pulse")).toBeTruthy();
    expect(screen.getByText("No Member Selected")).toBeTruthy();
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

    expect(await screen.findByRole("heading", { name: "Entry Monitoring" })).toBeTruthy();
    expect(screen.getByText("ROLE RESTRICTED: LIVE API DISABLED")).toBeTruthy();
    expect(screen.getByText("Access Control Restricted for this Role.")).toBeTruthy();
    expect(screen.getByText("No active visitors.")).toBeTruthy();
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

    expect(await screen.findByText("ROLE RESTRICTED: LIVE API DISABLED")).toBeTruthy();
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

    expect(screen.getByRole("heading", { name: "Entry Monitoring" })).toBeTruthy();
    await vi.runAllTimersAsync();

    const searchInput = screen.getByPlaceholderText("Scan Member ID or Search Name...");
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
