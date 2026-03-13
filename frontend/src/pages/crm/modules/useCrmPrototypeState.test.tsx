import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData } from "../../../api/mockData";
import { getQueryInvalidationVersion, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useCrmPrototypeState } from "./useCrmPrototypeState";

describe("useCrmPrototypeState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
    resetMockData();
    resetQueryInvalidationStateForTests();
  });

  it("invalidates crm domains after trigger action", async () => {
    const { result } = renderHook(() => useCrmPrototypeState());

    await act(async () => {
      await result.current.triggerCrmExpiryReminder();
    });

    expect(result.current.crmPanelMessage).toContain("큐에 적재");
    expect(getQueryInvalidationVersion("crmHistory")).toBe(1);
    expect(getQueryInvalidationVersion("crmQueue")).toBe(1);
  });

  it("rejects invalid daysAhead input", async () => {
    const { result } = renderHook(() => useCrmPrototypeState());

    act(() => {
      result.current.setCrmTriggerDaysAhead("-1");
    });

    await act(async () => {
      await result.current.triggerCrmExpiryReminder();
    });

    expect(result.current.crmPanelError).toBe("daysAhead는 0 이상의 숫자여야 합니다.");
  });

  it("calls live crm trigger endpoint in live mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          baseDate: "2026-03-13",
          targetDate: "2026-03-16",
          totalTargets: 1,
          createdCount: 1,
          duplicatedCount: 0
        },
        message: "CRM 만료임박 메시지 이벤트가 큐에 적재되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-crm-trigger"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCrmPrototypeState());

    await act(async () => {
      await result.current.triggerCrmExpiryReminder();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/crm/messages/triggers/membership-expiry-reminder",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.crmPanelMessage).toBe("CRM 만료임박 메시지 이벤트가 큐에 적재되었습니다.");
  });
});
