import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAccessWorkspaceLoader } from "./useWorkspaceLoaders";

describe("useAccessWorkspaceLoader", () => {
  it("passes a commit guard that turns false after cleanup", async () => {
    const ensureMembersLoaded = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    let capturedGuard: (() => boolean) | undefined;
    const reloadAccessData = vi
      .fn<(memberId?: number | null, shouldCommit?: () => boolean) => Promise<void>>()
      .mockImplementation(async (_memberId, shouldCommit) => {
        capturedGuard = shouldCommit;
      });
    const onError = vi.fn();

    const { unmount } = renderHook(() =>
      useAccessWorkspaceLoader({
        enabled: true,
        selectedMemberId: 42,
        ensureMembersLoaded,
        reloadAccessData,
        onError
      })
    );

    await waitFor(() => {
      expect(capturedGuard).toBeTypeOf("function");
    });

    expect(capturedGuard?.()).toBe(true);
    unmount();
    expect(capturedGuard?.()).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });
});
