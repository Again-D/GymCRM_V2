import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FoundationProviders } from "../../../app/providers";
import { SettlementSalesTrendChart } from "./SettlementSalesTrendChart";
import type { SettlementSalesTrendChartData } from "../modules/buildSettlementSalesTrendChartData";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  ComposedChart: ({ children }: { children: ReactNode }) => <div data-testid="composed-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Bar: () => <div data-testid="bar-series" />,
  Line: () => <div data-testid="line-series" />,
  Tooltip: () => <div data-testid="tooltip" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />
}));

const chartData: SettlementSalesTrendChartData = {
  chartHeight: 280,
  xAxisInterval: 0,
  hasDenseLabels: false,
  points: [
    {
      bucketStartDate: "2026-03-01",
      bucketLabel: "03/01",
      grossSales: 100000,
      refundAmount: 20000,
      netSales: 80000,
      transactionCount: 5
    }
  ]
};

describe("SettlementSalesTrendChart", () => {
  it("renders a loading shell with stable height", () => {
    render(
      <FoundationProviders>
        <SettlementSalesTrendChart chartData={chartData} loading />
      </FoundationProviders>
    );

    expect(screen.getByTestId("settlement-sales-trend-chart-loading")).toBeTruthy();
  });

  it("renders an empty state when there are no trend points", () => {
    render(
      <FoundationProviders>
        <SettlementSalesTrendChart
          chartData={{ ...chartData, points: [] }}
          loading={false}
        />
      </FoundationProviders>
    );

    expect(screen.getByTestId("settlement-sales-trend-chart-empty")).toBeTruthy();
    expect(screen.getByText("표시할 추이 데이터가 없습니다.")).toBeTruthy();
  });

  it("renders the composed chart surface when data exists", () => {
    render(
      <FoundationProviders>
        <SettlementSalesTrendChart chartData={chartData} loading={false} />
      </FoundationProviders>
    );

    expect(screen.getByTestId("settlement-sales-trend-chart")).toBeTruthy();
    expect(screen.getByTestId("responsive-container")).toBeTruthy();
    expect(screen.getByTestId("composed-chart")).toBeTruthy();
    expect(screen.getByTestId("line-series")).toBeTruthy();
    expect(screen.getByTestId("bar-series")).toBeTruthy();
    expect(screen.getByText("순매출 라인과 환불 막대를 함께 봅니다.")).toBeTruthy();
  });
});
