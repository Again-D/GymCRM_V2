import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { invalidateQueryDomains, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useCrmHistoryQuery } from "./useCrmHistoryQuery";

describe("useCrmHistoryQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetQueryInvalidationStateForTests();
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

    const { result } = renderHook(() => useCrmHistoryQuery());

    await act(async () => {
      await result.current.loadCrmHistory({ sendStatus: "PENDING", limit: "20" });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/crm/messages?limit=20&sendStatus=PENDING",
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
    expect(result.current.crmHistoryRows).toHaveLength(1);
  });

  it("reloads through a new cache key after crm invalidation", async () => {
    const fetchMock = vi.fn(async () => ({
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
              sendStatus: fetchMock.mock.calls.length > 1 ? "SENT" : "PENDING",
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
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCrmHistoryQuery());

    await act(async () => {
      await result.current.loadCrmHistory({ sendStatus: "", limit: "100" });
      await result.current.loadCrmHistory({ sendStatus: "", limit: "100" });
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      invalidateQueryDomains(["crmHistory"]);
    });

    await act(async () => {
      await result.current.loadCrmHistory({ sendStatus: "", limit: "100" });
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.crmHistoryRows[0]?.sendStatus).toBe("SENT");
  });
});
