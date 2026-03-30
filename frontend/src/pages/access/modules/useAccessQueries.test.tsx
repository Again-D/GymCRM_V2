import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useAccessQueries } from "./useAccessQueries";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAccessQueries", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
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

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAccessQueries(101), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.accessPresence?.openSessionCount).toBe(1);
      expect(result.current.accessEvents).toHaveLength(1);
    });
    expect(result.current.accessEvents[0]?.accessEventId).toBe(8101);
  });

  it("reloads from a new cache key after invalidation", async () => {
    let presenceCount = 0;
    const fetchMock = vi.fn(async (input: string) => {
      if (input === "/api/v1/access/presence") {
        presenceCount++;
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              openSessionCount: presenceCount,
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

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAccessQueries(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.accessPresence?.openSessionCount).toBe(1);
    });

    expect(fetchMock).toHaveBeenCalledTimes(2); // presence + events

    await act(async () => {
      await queryClient.invalidateQueries();
    });

    await vi.waitFor(() => {
      expect(result.current.accessPresence?.openSessionCount).toBe(2);
    });

    expect(fetchMock).toHaveBeenCalledTimes(4); // another 2 calls after invalidation
  });

  it("keeps access query actions stable across rerenders", () => {
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(() => useAccessQueries(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const firstRefetchPresence = result.current.refetchAccessPresence;
    const firstRefetchEvents = result.current.refetchAccessEvents;

    rerender();

    expect(result.current.refetchAccessPresence).toBe(firstRefetchPresence);
    expect(result.current.refetchAccessEvents).toBe(firstRefetchEvents);
  });
});
