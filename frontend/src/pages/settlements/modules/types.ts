import { startOfMonthLocalDate, todayLocalDate } from "../../../shared/date";

export type SettlementPaymentMethod = "" | "CASH" | "CARD" | "TRANSFER" | "ETC";
export type SettlementTabKey = "salesAnalytics" | "trainerPayroll";
export type SettlementTrendGranularity = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type SettlementAdjustmentType = "REFUND";

export type SettlementReportFilters = {
  startDate: string;
  endDate: string;
  paymentMethod: SettlementPaymentMethod;
  productKeyword: string;
  trendGranularity: SettlementTrendGranularity;
};

export type SettlementReportRow = {
  productName: string;
  paymentMethod: Exclude<SettlementPaymentMethod, "">;
  grossSales: number;
  refundAmount: number;
  netSales: number;
  transactionCount: number;
};

export type SettlementReport = {
  startDate: string;
  endDate: string;
  paymentMethod: Exclude<SettlementPaymentMethod, ""> | null;
  productKeyword: string | null;
  trendGranularity: SettlementTrendGranularity;
  totalGrossSales: number;
  totalRefundAmount: number;
  totalNetSales: number;
  trend: SettlementTrendPoint[];
  rows: SettlementReportRow[];
};

export type SettlementTrendPoint = {
  bucketStartDate: string;
  bucketLabel: string;
  grossSales: number;
  refundAmount: number;
  netSales: number;
  transactionCount: number;
};

export type SalesDashboard = {
  baseDate: string;
  expiringWithinDays: number;
  todayNetSales: number;
  monthNetSales: number;
  newMemberCount: number;
  expiringMemberCount: number;
  refundCount: number;
};

export type SettlementRecentAdjustment = {
  paymentId: number;
  adjustmentType: SettlementAdjustmentType;
  productName: string;
  memberName: string;
  paymentMethod: Exclude<SettlementPaymentMethod, "">;
  amount: number;
  paidAt: string;
  memo: string | null;
  approvalRef: string | null;
};

export function createDefaultSettlementFilters(): SettlementReportFilters {
  const today = todayLocalDate();
  return {
    startDate: startOfMonthLocalDate(today),
    endDate: today,
    paymentMethod: "",
    productKeyword: "",
    trendGranularity: "DAILY"
  };
}
