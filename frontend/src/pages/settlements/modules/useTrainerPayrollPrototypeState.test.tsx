import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTrainerPayrollPrototypeState } from "./useTrainerPayrollPrototypeState";

describe("useTrainerPayrollPrototypeState", () => {
  it("submits a validated trainer payroll query", () => {
    const { result } = renderHook(() => useTrainerPayrollPrototypeState("2026-03-31"));

    let submitted = null;
    act(() => {
      submitted = result.current.submitTrainerPayrollFilters();
    });

    expect(submitted).toEqual({
      settlementMonth: "2026-03",
      sessionUnitPrice: 50000
    });
    expect(result.current.submittedTrainerPayrollQuery).toEqual(submitted);
  });

  it("rejects invalid settlement month and negative price", () => {
    const { result } = renderHook(() => useTrainerPayrollPrototypeState("2026-03-31"));

    act(() => {
      result.current.setTrainerPayrollFilters({
        settlementMonth: "2026-13",
        sessionUnitPrice: "-1"
      });
    });

    let submitted = null;
    act(() => {
      submitted = result.current.submitTrainerPayrollFilters();
    });

    expect(submitted).toBeNull();
    expect(result.current.trainerPayrollPanelError).toBe("정산 월은 YYYY-MM 형식으로 입력해야 합니다.");
  });

  it("resets filters and feedback", () => {
    const { result } = renderHook(() => useTrainerPayrollPrototypeState("2026-03-31"));

    act(() => {
      result.current.setTrainerPayrollFilters({
        settlementMonth: "2026-04",
        sessionUnitPrice: "65000"
      });
      result.current.setTrainerPayrollPanelMessage("ok");
      result.current.setTrainerPayrollPanelError("bad");
    });

    act(() => {
      result.current.resetTrainerPayrollWorkspace();
    });

    expect(result.current.trainerPayrollFilters).toEqual({
      settlementMonth: "2026-03",
      sessionUnitPrice: "50000"
    });
    expect(result.current.submittedTrainerPayrollQuery).toBeNull();
    expect(result.current.trainerPayrollPanelMessage).toBeNull();
    expect(result.current.trainerPayrollPanelError).toBeNull();
  });
});
