import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { invalidateQueryDomains, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useAccessQueries } from "./useAccessQueries";

describe("useAccessQueries", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetQueryInvalidationStateForTests();
  });

  it("loads access presence and events", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v1/access/presence") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              openSessionCount: 1,
              todayEntryGrantedCount: 2,
              todayExitCount: 1,
              todayEntryDeniedCount: 0,
              openSessions: [
                {
                  accessSessionId: 9001,
                  memberId: 101,
                  memberName: "김민수",
                  membershipId: 5001,
                  reservationId: null,
                  entryAt: "2026-03-12T10:00:00Z"
                }
              ]
            }
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              accessEventId: 8101,
              memberId: 101,
              membershipId: 5001,
              reservationId: null,
              eventType: "ENTRY_GRANTED",
              denyReason: null,
              processedAt: "2026-03-12T10:00:00Z"
            }
          ]
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAccessQueries());

    await act(async () => {
      await result.current.reloadAccessData(101);
    });

    expect(result.current.accessPresence?.openSessionCount).toBe(1);
    expect(result.current.accessEvents).toHaveLength(1);
  });

  it("reloads from a new cache key after invalidation", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v1/access/presence") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              openSessionCount: fetchMock.mock.calls.filter(([url]) => url === "/api/v1/access/presence").length,
              todayEntryGrantedCount: 0,
              todayExitCount: 0,
              todayEntryDeniedCount: 0,
              openSessions: []
            }
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: []
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAccessQueries());

    await act(async () => {
      await result.current.loadAccessPresence();
      await result.current.loadAccessPresence();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      invalidateQueryDomains(["accessPresence"]);
    });

    await act(async () => {
      await result.current.loadAccessPresence();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.accessPresence?.openSessionCount).toBe(2);
  });
});
