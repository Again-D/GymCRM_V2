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
  const today = new Date().toISOString().slice(0, 10);
  return {
    startDate: `${today.slice(0, 8)}01`,
    endDate: today,
    paymentMethod: "",
    productKeyword: ""
  };
}
