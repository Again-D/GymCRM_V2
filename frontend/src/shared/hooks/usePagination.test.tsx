import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  it("returns the correct slice for the current page", () => {
    const { result } = renderHook(() =>
      usePagination(Array.from({ length: 25 }, (_, index) => index + 1), {
        initialPageSize: 10
      })
    );

    expect(result.current.pagedItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.pagedItems).toEqual([21, 22, 23, 24, 25]);
  });

  it("resets to the first page when reset deps change", () => {
    const { result, rerender } = renderHook(
      ({ keyword }) =>
        usePagination(Array.from({ length: 25 }, (_, index) => index + 1), {
          initialPageSize: 10,
          resetDeps: [keyword]
        }),
      {
        initialProps: { keyword: "" }
      }
    );

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.page).toBe(3);

    rerender({ keyword: "kim" });

    expect(result.current.page).toBe(1);
    expect(result.current.pagedItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("clamps the current page when the item count shrinks", () => {
    const { result, rerender } = renderHook(
      ({ items }) =>
        usePagination(items, {
          initialPageSize: 10
        }),
      {
        initialProps: {
          items: Array.from({ length: 25 }, (_, index) => index + 1)
        }
      }
    );

    act(() => {
      result.current.setPage(3);
    });

    rerender({
      items: Array.from({ length: 12 }, (_, index) => index + 1)
    });

    expect(result.current.page).toBe(2);
    expect(result.current.pagedItems).toEqual([11, 12]);
  });
});
