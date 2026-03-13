import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData } from "../../../api/mockData";
import { getQueryInvalidationVersion, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useLockerPrototypeState } from "./useLockerPrototypeState";

describe("useLockerPrototypeState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
    resetMockData();
    resetQueryInvalidationStateForTests();
  });

  it("prefills selected member and invalidates both locker domains after assign", async () => {
    const { result } = renderHook(() => useLockerPrototypeState(102));

    expect(result.current.lockerAssignForm.memberId).toBe("102");

    await act(async () => {
      result.current.setLockerAssignForm((prev) => ({
        ...prev,
        lockerSlotId: "4002"
      }));
    });

    await act(async () => {
      await result.current.handleLockerAssign();
    });

    expect(result.current.lockerPanelMessage).toContain("배정");
    expect(getQueryInvalidationVersion("lockerSlots")).toBe(1);
    expect(getQueryInvalidationVersion("lockerAssignments")).toBe(1);
  });

  it("returns an active locker assignment", async () => {
    const { result } = renderHook(() => useLockerPrototypeState());

    await act(async () => {
      await result.current.handleLockerReturn(6001);
    });

    expect(result.current.lockerPanelMessage).toContain("반납");
  });

  it("assigns lockers through live API mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          lockerAssignmentId: 7001
        },
        message: "라커가 배정되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-locker-assign"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useLockerPrototypeState(102));

    await act(async () => {
      result.current.setLockerAssignForm((prev) => ({
        ...prev,
        lockerSlotId: "4002"
      }));
    });

    await act(async () => {
      await result.current.handleLockerAssign();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/lockers/assignments",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.lockerPanelMessage).toBe("라커가 배정되었습니다.");
  });
});
