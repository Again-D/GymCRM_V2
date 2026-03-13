import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useWorkspaceMemberSearchLoader } from "./useWorkspaceMemberSearchLoader";

describe("useWorkspaceMemberSearchLoader", () => {
  it("clears cache when its invalidation version changes", async () => {
    const fetchRows = vi.fn().mockResolvedValue([{ memberId: 1 }]);

    const { result, rerender } = renderHook(
      ({ invalidationVersion }) =>
        useWorkspaceMemberSearchLoader(fetchRows, {
          invalidationVersion
        }),
      {
        initialProps: { invalidationVersion: 0 }
      }
    );

    await act(async () => {
      await result.current.load("kim");
      await result.current.load("kim");
    });

    expect(fetchRows).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender({ invalidationVersion: 1 });
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.load("kim");
    });

    expect(fetchRows).toHaveBeenCalledTimes(2);
  });
});
