import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSettlementPrototypeState } from "./useSettlementPrototypeState";

describe("useSettlementPrototypeState", () => {
  it("resets filters and feedback to defaults", () => {
    const { result } = renderHook(() => useSettlementPrototypeState());

    act(() => {
      result.current.setSettlementFilters((prev) => ({
        ...prev,
        paymentMethod: "CARD",
        productKeyword: "PT"
      }));
      result.current.setSettlementReceivablesFilters((prev) => ({
        ...prev,
        baseDate: "2026-03-15",
        limit: 25
      }));
      result.current.setSettlementPanelMessage("ok");
      result.current.setSettlementPanelError("bad");
    });

    act(() => {
      result.current.resetSettlementWorkspace();
    });

    expect(result.current.settlementFilters.paymentMethod).toBe("");
    expect(result.current.settlementFilters.productKeyword).toBe("");
    expect(result.current.settlementReceivablesFilters.baseDate).not.toBe("2026-03-15");
    expect(result.current.settlementReceivablesFilters.limit).toBe(10);
    expect(result.current.settlementPanelMessage).toBeNull();
    expect(result.current.settlementPanelError).toBeNull();
  });
});
