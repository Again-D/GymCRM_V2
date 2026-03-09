import { useState } from "react";

export type SalesSettlementReportRow = {
  productName: string;
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "ETC";
  grossSales: number;
  refundAmount: number;
  netSales: number;
  transactionCount: number;
};

export type SalesSettlementReport = {
  startDate: string;
  endDate: string;
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "ETC" | null;
  productKeyword: string | null;
  totalGrossSales: number;
  totalRefundAmount: number;
  totalNetSales: number;
  rows: SalesSettlementReportRow[];
};

export type SettlementReportFilters = {
  startDate: string;
  endDate: string;
  paymentMethod: "" | "CASH" | "CARD" | "TRANSFER" | "ETC";
  productKeyword: string;
};

export function createInitialSettlementFilters(): SettlementReportFilters {
  const today = new Date().toISOString().slice(0, 10);
  return {
    startDate: `${today.slice(0, 8)}01`,
    endDate: today,
    paymentMethod: "",
    productKeyword: ""
  };
}

export function useSettlementWorkspaceState() {
  const [settlementFilters, setSettlementFilters] = useState<SettlementReportFilters>(createInitialSettlementFilters);
  const [settlementReport, setSettlementReport] = useState<SalesSettlementReport | null>(null);
  const [settlementReportLoading, setSettlementReportLoading] = useState(false);
  const [settlementPanelMessage, setSettlementPanelMessage] = useState<string | null>(null);
  const [settlementPanelError, setSettlementPanelError] = useState<string | null>(null);

  function resetSettlementWorkspace() {
    setSettlementFilters(createInitialSettlementFilters());
    setSettlementReport(null);
    setSettlementReportLoading(false);
    setSettlementPanelMessage(null);
    setSettlementPanelError(null);
  }

  return {
    settlementFilters,
    setSettlementFilters,
    settlementReport,
    setSettlementReport,
    settlementReportLoading,
    setSettlementReportLoading,
    settlementPanelMessage,
    setSettlementPanelMessage,
    settlementPanelError,
    setSettlementPanelError,
    resetSettlementWorkspace
  };
}
