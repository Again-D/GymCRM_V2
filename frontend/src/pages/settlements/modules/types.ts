import { startOfMonthLocalDate, todayLocalDate } from "../../../shared/date";

export type SettlementPaymentMethod = "" | "CASH" | "CARD" | "TRANSFER" | "ETC";

export type SettlementReportFilters = {
  startDate: string;
  endDate: string;
  paymentMethod: SettlementPaymentMethod;
  productKeyword: string;
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
  totalGrossSales: number;
  totalRefundAmount: number;
  totalNetSales: number;
  rows: SettlementReportRow[];
};

export function createDefaultSettlementFilters(): SettlementReportFilters {
  const today = todayLocalDate();
  return {
    startDate: startOfMonthLocalDate(today),
    endDate: today,
    paymentMethod: "",
    productKeyword: ""
  };
}
