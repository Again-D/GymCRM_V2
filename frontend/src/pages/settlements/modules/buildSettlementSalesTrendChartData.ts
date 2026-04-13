import type { SettlementTrendPoint } from "./types";

export type SettlementSalesTrendChartData = {
  points: SettlementTrendPoint[];
  chartHeight: number;
  xAxisInterval: number;
  hasDenseLabels: boolean;
};

export function buildSettlementSalesTrendChartData(trendPoints: SettlementTrendPoint[]): SettlementSalesTrendChartData {
  const pointCount = trendPoints.length;
  const chartHeight = pointCount > 16 ? 320 : 280;

  return {
    points: trendPoints,
    chartHeight,
    xAxisInterval: pointCount > 24 ? 3 : pointCount > 16 ? 2 : pointCount > 8 ? 1 : 0,
    hasDenseLabels: pointCount > 12
  };
}
