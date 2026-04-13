import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Empty, Skeleton, Space, Typography, theme } from "antd";

import type { SettlementSalesTrendChartData } from "../modules/buildSettlementSalesTrendChartData";
import type { SettlementTrendPoint } from "../modules/types";
import styles from "./SettlementSalesTrendChart.module.css";

const { Text } = Typography;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function formatAxisAmount(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(amount);
}

type SettlementSalesTrendTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: SettlementTrendPoint;
  }>;
};

function SettlementSalesTrendTooltip({ active, payload }: SettlementSalesTrendTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload as SettlementTrendPoint | undefined;
  if (!point) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{point.bucketLabel}</div>
      <div className={styles.tooltipRow}>
        <Text className={styles.tooltipLabel}>순매출</Text>
        <Text className={styles.tooltipValue}>{formatCurrency(point.netSales)}</Text>
      </div>
      <div className={styles.tooltipRow}>
        <Text className={styles.tooltipLabel}>환불</Text>
        <Text className={styles.tooltipValue}>{formatCurrency(point.refundAmount)}</Text>
      </div>
      <div className={styles.tooltipRow}>
        <Text className={styles.tooltipLabel}>총매출</Text>
        <Text className={styles.tooltipValue}>{formatCurrency(point.grossSales)}</Text>
      </div>
      <div className={styles.tooltipRow}>
        <Text className={styles.tooltipLabel}>거래 수</Text>
        <Text className={styles.tooltipValue}>{point.transactionCount}건</Text>
      </div>
    </div>
  );
}

type SettlementSalesTrendChartProps = {
  chartData: SettlementSalesTrendChartData;
  loading: boolean;
};

export function SettlementSalesTrendChart({ chartData, loading }: SettlementSalesTrendChartProps) {
  const { token } = theme.useToken();

  if (loading) {
    return (
      <div className={styles.loadingState} data-testid="settlement-sales-trend-chart-loading">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (chartData.points.length === 0) {
    return (
      <div className={styles.emptyState} data-testid="settlement-sales-trend-chart-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="표시할 추이 데이터가 없습니다." />
      </div>
    );
  }

  return (
    <Space direction="vertical" size={12} className={styles.surface} data-testid="settlement-sales-trend-chart">
      <div className={styles.chartShell}>
        <div className={styles.chartFrame}>
          <div className={styles.chartToolbar}>
            <Text strong>순매출 라인과 환불 막대를 함께 봅니다.</Text>
            <Text type="secondary" className={styles.chartHint}>
              총매출은 툴팁과 표에서 함께 확인합니다.
            </Text>
          </div>
          <ResponsiveContainer width="100%" height={chartData.chartHeight}>
            <ComposedChart data={chartData.points} margin={{ top: 16, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
              <XAxis
                dataKey="bucketLabel"
                interval={chartData.xAxisInterval}
                tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: token.colorBorderSecondary }}
                minTickGap={chartData.hasDenseLabels ? 20 : 12}
              />
              <YAxis
                tickFormatter={formatAxisAmount}
                tick={{ fill: token.colorTextSecondary, fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: token.colorBorderSecondary }}
                width={56}
              />
              <Tooltip content={<SettlementSalesTrendTooltip />} />
              <Bar
                dataKey="refundAmount"
                name="환불"
                fill={token.colorError}
                radius={[6, 6, 0, 0]}
                barSize={18}
              />
              <Line
                type="monotone"
                dataKey="netSales"
                name="순매출"
                stroke={token.colorSuccess}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Space>
  );
}
