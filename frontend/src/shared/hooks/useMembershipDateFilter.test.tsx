import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMembershipDateFilter } from "./useMembershipDateFilter";

describe("useMembershipDateFilter", () => {
  it("fills dateFrom and dateTo from the selected preset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T09:00:00Z"));

    const { result } = renderHook(() => useMembershipDateFilter());

    act(() => {
      result.current.applyPreset("1m");
    });

    expect(result.current.dateFilter.presetRange).toBe("1m");
    expect(result.current.dateFilter.dateFrom).toBe("2026-03-11");
    expect(result.current.dateFilter.dateTo).toBe("2026-04-11");

    vi.useRealTimers();
  });

  it("clears the preset when dates are edited manually", () => {
    const { result } = renderHook(() => useMembershipDateFilter());

    act(() => {
      result.current.applyPreset("1w");
      result.current.setDateFrom("2026-03-15");
    });

    expect(result.current.dateFilter.presetRange).toBe("");
    expect(result.current.dateFilter.dateFrom).toBe("2026-03-15");
  });
});
