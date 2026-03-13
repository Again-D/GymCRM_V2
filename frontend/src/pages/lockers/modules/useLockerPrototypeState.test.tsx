import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { resetMockData } from "../../../api/mockData";
import { getQueryInvalidationVersion, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useLockerPrototypeState } from "./useLockerPrototypeState";

describe("useLockerPrototypeState", () => {
  beforeEach(() => {
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
});
