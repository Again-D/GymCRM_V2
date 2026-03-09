import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAccessQueries } from "./useAccessQueries";

type PresenceResponse = {
  data: {
    openSessionCount: number;
    todayEntryGrantedCount: number;
    todayExitCount: number;
    todayEntryDeniedCount: number;
    openSessions: Array<{
      accessSessionId: number;
      memberId: number;
      memberName: string;
      phone: string;
      membershipId: number | null;
      reservationId: number | null;
      entryAt: string;
    }>;
  };
};

type EventsResponse = {
  data: Array<{
    accessEventId: number;
    centerId: number;
    memberId: number;
    membershipId: number | null;
    reservationId: number | null;
    processedBy: number;
    eventType: "ENTRY_GRANTED";
    denyReason: string | null;
    processedAt: string;
  }>;
};

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock
}));

describe("useAccessQueries", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("reloads presence and events for the selected member", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        data: {
          openSessionCount: 2,
          todayEntryGrantedCount: 5,
          todayExitCount: 4,
          todayEntryDeniedCount: 1,
          openSessions: []
        }
      })
      .mockResolvedValueOnce({
        data: [
          {
            accessEventId: 7,
            centerId: 1,
            memberId: 42,
            membershipId: 9,
            reservationId: null,
            processedBy: 3,
            eventType: "ENTRY_GRANTED",
            denyReason: null,
            processedAt: "2026-03-09T10:00:00Z"
          }
        ]
      });

    const { result } = renderHook(() =>
      useAccessQueries({
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      await result.current.reloadAccessData(42);
    });

    await waitFor(() => {
      expect(result.current.accessPresence?.openSessionCount).toBe(2);
      expect(result.current.accessEvents).toHaveLength(1);
    });

    expect(apiGetMock).toHaveBeenNthCalledWith(1, "/api/v1/access/presence");
    expect(apiGetMock).toHaveBeenNthCalledWith(2, "/api/v1/access/events?limit=100&memberId=42");
  });

  it("ignores late access responses after reset", async () => {
    let resolvePresence: ((value: PresenceResponse) => void) | null = null;
    let resolveEvents: ((value: EventsResponse) => void) | null = null;
    apiGetMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePresence = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveEvents = resolve;
          })
      );

    const { result } = renderHook(() =>
      useAccessQueries({
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      void result.current.reloadAccessData(42);
    });

    act(() => {
      result.current.resetAccessQueries();
    });

    await act(async () => {
      resolvePresence?.({
        data: {
          openSessionCount: 1,
          todayEntryGrantedCount: 1,
          todayExitCount: 0,
          todayEntryDeniedCount: 0,
          openSessions: []
        }
      });
      resolveEvents?.({
        data: [
          {
            accessEventId: 99,
            centerId: 1,
            memberId: 42,
            membershipId: null,
            reservationId: null,
            processedBy: 3,
            eventType: "ENTRY_GRANTED",
            denyReason: null,
            processedAt: "2026-03-09T10:00:00Z"
          }
        ]
      });
      await Promise.resolve();
    });

    expect(result.current.accessPresence).toBeNull();
    expect(result.current.accessEvents).toEqual([]);
    expect(result.current.accessPresenceLoading).toBe(false);
    expect(result.current.accessEventsLoading).toBe(false);
    expect(result.current.accessQueryError).toBeNull();
  });
});
