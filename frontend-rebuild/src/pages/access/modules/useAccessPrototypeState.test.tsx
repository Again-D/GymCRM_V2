import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { resetMockData } from "../../../api/mockData";
import { getQueryInvalidationVersion, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useAccessPrototypeState } from "./useAccessPrototypeState";

describe("useAccessPrototypeState", () => {
  beforeEach(() => {
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
});
