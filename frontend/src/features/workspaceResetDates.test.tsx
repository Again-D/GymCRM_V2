import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLockerWorkspaceState } from "./lockers/useLockerWorkspaceState";
import { useMembershipWorkspaceState } from "./memberships/useMembershipWorkspaceState";

describe("workspace reset dates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("recomputes membership purchase dates when the selected member changes after a day boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00.000Z"));

    const { result, rerender } = renderHook(
      ({ selectedMemberId }) => useMembershipWorkspaceState(selectedMemberId),
      { initialProps: { selectedMemberId: 101 } }
    );

    act(() => {
      result.current.setPurchaseForm((current) => ({
        ...current,
        startDate: "2026-03-01",
        paidAmount: "120000"
      }));
    });

    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    act(() => {
      rerender({ selectedMemberId: 202 });
    });

    expect(result.current.purchaseForm.startDate).toBe("2026-03-10");
    expect(result.current.purchaseForm.paidAmount).toBe("");
  });

  it("recomputes membership purchase dates when the workspace is reset after a day boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00.000Z"));

    const { result } = renderHook(() => useMembershipWorkspaceState(101));

    act(() => {
      result.current.setPurchaseForm((current) => ({
        ...current,
        startDate: "2026-03-01",
        paidAmount: "90000"
      }));
    });

    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    act(() => {
      result.current.resetMembershipWorkspace();
    });

    expect(result.current.purchaseForm.startDate).toBe("2026-03-10");
    expect(result.current.purchaseForm.paidAmount).toBe("");
  });

  it("recomputes locker assignment dates when the workspace is reset after a day boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00.000Z"));

    const { result } = renderHook(() => useLockerWorkspaceState());

    act(() => {
      result.current.setLockerAssignForm((current) => ({
        ...current,
        startDate: "2026-03-01",
        endDate: "2026-03-02",
        memberId: "44"
      }));
    });

    vi.setSystemTime(new Date("2026-03-10T12:00:00.000Z"));

    act(() => {
      result.current.resetLockerWorkspace();
    });

    expect(result.current.lockerAssignForm.startDate).toBe("2026-03-10");
    expect(result.current.lockerAssignForm.endDate).toBe("2026-03-10");
    expect(result.current.lockerAssignForm.memberId).toBe("");
  });
});
