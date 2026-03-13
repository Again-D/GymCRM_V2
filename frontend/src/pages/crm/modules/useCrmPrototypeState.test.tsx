import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { resetMockData } from "../../../api/mockData";
import { getQueryInvalidationVersion, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useCrmPrototypeState } from "./useCrmPrototypeState";

describe("useCrmPrototypeState", () => {
  beforeEach(() => {
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
});
