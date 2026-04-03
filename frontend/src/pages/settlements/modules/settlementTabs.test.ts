import { describe, expect, it } from "vitest";

import { DEFAULT_SETTLEMENT_TAB, resolveSettlementTab, settlementTabs } from "./settlementTabs";

describe("settlementTabs", () => {
  it("defaults to sales analytics tab", () => {
    expect(DEFAULT_SETTLEMENT_TAB).toBe("salesAnalytics");
    expect(settlementTabs[0]?.key).toBe("salesAnalytics");
  });

  it("resolves known tab keys and falls back for unknown values", () => {
    expect(resolveSettlementTab("trainerPayroll")).toBe("trainerPayroll");
    expect(resolveSettlementTab("unknown")).toBe("salesAnalytics");
    expect(resolveSettlementTab(undefined)).toBe("salesAnalytics");
  });
});
