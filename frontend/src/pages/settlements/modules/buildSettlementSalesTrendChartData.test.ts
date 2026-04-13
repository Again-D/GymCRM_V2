import { describe, expect, it } from "vitest";

import { buildSettlementSalesTrendChartData } from "./buildSettlementSalesTrendChartData";

describe("buildSettlementSalesTrendChartData", () => {
  it("adapts chart density for small and large trend sets", () => {
    expect(
      buildSettlementSalesTrendChartData([
        {
          bucketStartDate: "2026-03-01",
          bucketLabel: "03/01",
          grossSales: 100000,
          refundAmount: 10000,
          netSales: 90000,
          transactionCount: 3
        }
      ])
    ).toEqual({
      points: [
        {
          bucketStartDate: "2026-03-01",
          bucketLabel: "03/01",
          grossSales: 100000,
          refundAmount: 10000,
          netSales: 90000,
          transactionCount: 3
        }
      ],
      chartHeight: 280,
      xAxisInterval: 0,
      hasDenseLabels: false
    });

    expect(
      buildSettlementSalesTrendChartData(
        Array.from({ length: 18 }, (_, index) => ({
          bucketStartDate: `2026-03-${String(index + 1).padStart(2, "0")}`,
          bucketLabel: `03/${String(index + 1).padStart(2, "0")}`,
          grossSales: 100000,
          refundAmount: 10000,
          netSales: 90000,
          transactionCount: 3
        }))
      )
    ).toMatchObject({
      chartHeight: 320,
      xAxisInterval: 2,
      hasDenseLabels: true
    });
  });
});
