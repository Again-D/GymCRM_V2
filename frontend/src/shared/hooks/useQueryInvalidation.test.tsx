import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQueryInvalidation } from "./useQueryInvalidation";

describe("useQueryInvalidation", () => {
  it("increments only the requested domains", () => {
    const { result } = renderHook(() => useQueryInvalidation());

    act(() => {
      result.current.invalidateQueries("members", "reservationSchedules");
    });

    expect(result.current.queryInvalidationVersions.members).toBe(1);
    expect(result.current.queryInvalidationVersions.reservationSchedules).toBe(1);
    expect(result.current.queryInvalidationVersions.products).toBe(0);
  });

  it("resets all versions back to zero", () => {
    const { result } = renderHook(() => useQueryInvalidation());

    act(() => {
      result.current.invalidateQueries("members", "products", "workspaceMemberSearch");
    });

    act(() => {
      result.current.resetQueryInvalidation();
    });

    expect(result.current.queryInvalidationVersions).toEqual({
      members: 0,
      products: 0,
      reservationTargets: 0,
      reservationSchedules: 0,
      workspaceMemberSearch: 0
    });
  });
});
