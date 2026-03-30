import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useCrmHistoryQuery } from "./useCrmHistoryQuery";
import { createDefaultCrmFilters } from "./types";

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

describe("useCrmHistoryQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("loads crm history rows with filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          rows: [
            {
              crmMessageEventId: 12001,
              memberId: 101,
              membershipId: 9001,
              eventType: "MEMBERSHIP_EXPIRY_REMINDER",
              channelType: "SMS",
              sendStatus: "PENDING",
              attemptCount: 0,
              lastAttemptedAt: null,
              nextAttemptAt: null,
              sentAt: null,
              failedAt: null,
              lastErrorMessage: null,
              traceId: "trace-1",
              createdAt: "2026-03-13T09:00:00+09:00"
            }
          ]
        },
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const filters = { sendStatus: "PENDING" as const, limit: "20" };
    const { result } = renderHook(() => useCrmHistoryQuery(filters), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.crmHistoryRows).toHaveLength(1);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/crm/messages?limit=20&sendStatus=PENDING",
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
  });

  it("reloads from a new cache key after invalidation", async () => {
    let callCount = 0;
    const fetchMock = vi.fn(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            rows: [
              {
                crmMessageEventId: 12000 + callCount,
                memberId: 101,
                membershipId: 9001,
                sendStatus: callCount > 1 ? "SENT" : "PENDING",
                createdAt: "2026-03-13T09:00:00+09:00"
              }
            ]
          }
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const filters = createDefaultCrmFilters();
    const { result } = renderHook(() => useCrmHistoryQuery(filters), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.crmHistoryRows[0]?.sendStatus).toBe("PENDING");
    });

    await act(async () => {
      await queryClient.invalidateQueries();
    });

    await vi.waitFor(() => {
      expect(result.current.crmHistoryRows[0]?.sendStatus).toBe("SENT");
    });
  });

  it("keeps crm query actions stable across rerenders", () => {
    const queryClient = createTestQueryClient();
    const filters = createDefaultCrmFilters();
    const { result, rerender } = renderHook(() => useCrmHistoryQuery(filters), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const firstRefetch = result.current.refetchCrmHistory;

    rerender();

    expect(result.current.refetchCrmHistory).toBe(firstRefetch);
  });
});
