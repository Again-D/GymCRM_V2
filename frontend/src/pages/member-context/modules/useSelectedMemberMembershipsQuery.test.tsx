import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useSelectedMemberMembershipsQuery } from "./useSelectedMemberMembershipsQuery";

describe("useSelectedMemberMembershipsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
  });

  it("keeps membership query actions stable across rerenders", () => {
    const { result, rerender } = renderHook(() => useSelectedMemberMembershipsQuery());

    const firstLoad = result.current.loadSelectedMemberMemberships;
    const firstReset = result.current.resetSelectedMemberMembershipsQuery;

    rerender();

    expect(result.current.loadSelectedMemberMemberships).toBe(firstLoad);
    expect(result.current.resetSelectedMemberMembershipsQuery).toBe(firstReset);
  });
});
