import { describe, expect, it } from "vitest";

import { buildTrainerSettlementScopeOptions } from "./buildTrainerSettlementScopeOptions";

describe("buildTrainerSettlementScopeOptions", () => {
  it("prepends ALL and uses live trainer query values", () => {
    expect(
      buildTrainerSettlementScopeOptions([
        { userId: 77, centerId: 1, userName: "박트레이너" },
        { userId: 88, centerId: 1, userName: "이트레이너" }
      ])
    ).toEqual([
      { label: "전체 트레이너", value: "ALL" },
      { label: "박트레이너", value: "77" },
      { label: "이트레이너", value: "88" }
    ]);
  });
});
