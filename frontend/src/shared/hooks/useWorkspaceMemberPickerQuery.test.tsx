import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceMemberPickerQuery } from "./useWorkspaceMemberPickerQuery";

describe("useWorkspaceMemberPickerQuery", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps only the latest query result when requests resolve out of order", async () => {
    vi.useFakeTimers();

    let resolveFirst: ((rows: Array<{ memberId: number; memberName: string; phone: string; memberStatus: "ACTIVE" }>) => void) | null = null;
    let resolveSecond: ((rows: Array<{ memberId: number; memberName: string; phone: string; memberStatus: "ACTIVE" }>) => void) | null = null;

    const loadMembers = vi
      .fn<(keyword?: string) => Promise<Array<{ memberId: number; memberName: string; phone: string; memberStatus: "ACTIVE" }>>>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    const { result } = renderHook(() => useWorkspaceMemberPickerQuery({ loadMembers, debounceMs: 250 }));

    await act(async () => {
      result.current.setQuery("kim");
      vi.advanceTimersByTime(250);
    });

    await act(async () => {
      result.current.setQuery("lee");
      vi.advanceTimersByTime(250);
    });

    await act(async () => {
      resolveSecond?.([{ memberId: 2, memberName: "Lee", phone: "010", memberStatus: "ACTIVE" }]);
      await Promise.resolve();
    });

    await act(async () => {
      resolveFirst?.([{ memberId: 1, memberName: "Kim", phone: "010", memberStatus: "ACTIVE" }]);
      await Promise.resolve();
    });

    expect(result.current.rows).toEqual([{ memberId: 2, memberName: "Lee", phone: "010", memberStatus: "ACTIVE" }]);
  });
});
