import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTrainerSettlementWorkspaceState } from "./useTrainerSettlementWorkspaceState";

describe("useTrainerSettlementWorkspaceState", () => {
  it("clears active settlement when settlement month changes", () => {
    const { result } = renderHook(() => useTrainerSettlementWorkspaceState("2026-04-10"));

    act(() => {
      result.current.syncCreatedSettlement({
        settlementId: 99,
        trainer: {
          trainerId: "ALL",
          name: "전체 트레이너"
        },
        period: {
          start: "2026-04-01",
          end: "2026-04-10"
        },
        summary: {
          totalSessions: 10,
          completedSessions: 8,
          cancelledSessions: 1,
          noShowSessions: 1,
          ptSessions: 8,
          gxSessions: 2
        },
        calculation: {
          ptRatePerSession: null,
          gxRatePerSession: null,
          ptAmount: 400000,
          gxAmount: 60000,
          bonus: 0,
          bonusReason: null,
          deduction: 0,
          deductionReason: null,
          totalAmount: 460000
        },
        status: "DRAFT",
        createdAt: "2026-04-10T10:00:00+09:00"
      });
    });

    act(() => {
      result.current.setTrainerSettlementFilters((prev) => ({
        ...prev,
        settlementMonth: "2026-05"
      }));
    });

    expect(result.current.activeSettlement).toBeNull();
  });

  it("validates settlementMonth format before submitting preview query", () => {
    const { result } = renderHook(() => useTrainerSettlementWorkspaceState("2026-04-10"));

    act(() => {
      result.current.setTrainerSettlementFilters({
        trainerId: "ALL",
        settlementMonth: "2026-13"
      });
    });

    let submitted = null;
    act(() => {
      submitted = result.current.submitTrainerSettlementFilters();
    });

    expect(submitted).toBeNull();
    expect(result.current.trainerSettlementPanelError).toContain("정산 월");
  });
});
