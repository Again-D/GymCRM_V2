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
      result.current.setSettlementPanelMessage("ok");
      result.current.setSettlementPanelError("bad");
    });

    act(() => {
      result.current.resetSettlementWorkspace();
    });

    expect(result.current.settlementFilters.paymentMethod).toBe("");
    expect(result.current.settlementFilters.productKeyword).toBe("");
    expect(result.current.settlementPanelMessage).toBeNull();
    expect(result.current.settlementPanelError).toBeNull();
  });
});
