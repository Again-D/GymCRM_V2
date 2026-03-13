import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData } from "../../../api/mockData";
import { getQueryInvalidationVersion, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useAccessPrototypeState } from "./useAccessPrototypeState";

describe("useAccessPrototypeState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
    resetMockData();
    resetQueryInvalidationStateForTests();
  });

  it("invalidates access queries after entry", async () => {
    const { result } = renderHook(() => useAccessPrototypeState());

    await act(async () => {
      await result.current.handleAccessEntry(102);
    });

    expect(result.current.accessPanelMessage).toContain("입장을 처리했습니다.");
    expect(getQueryInvalidationVersion("accessPresence")).toBe(1);
    expect(getQueryInvalidationVersion("accessEvents")).toBe(1);
  });

  it("reports an error when exit is attempted without an open session", async () => {
    const { result } = renderHook(() => useAccessPrototypeState());

    await act(async () => {
      await result.current.handleAccessExit(102);
    });

    expect(result.current.accessPanelError).toBe("현재 입장중인 세션이 없습니다.");
  });

  it("uses live entry API in live mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          accessEventId: 7001,
          memberId: 102,
          membershipId: null,
          reservationId: null,
          eventType: "ENTRY_GRANTED",
          denyReason: null,
          processedAt: "2026-03-13T10:00:00+09:00"
        },
        message: "입장 처리되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-entry"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAccessPrototypeState());

    await act(async () => {
      await result.current.handleAccessEntry(102);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/access/entry",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.accessPanelMessage).toBe("입장 처리되었습니다.");
  });
});
