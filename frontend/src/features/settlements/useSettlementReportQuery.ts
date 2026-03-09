import { useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";
import type { SalesSettlementReport, SettlementReportFilters } from "./useSettlementWorkspaceState";

type UseSettlementReportQueryOptions = {
  getDefaultFilters: () => SettlementReportFilters;
  formatError: (error: unknown) => string;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function canCommitState(shouldCommit?: () => boolean) {
  return shouldCommit?.() ?? true;
}

export function useSettlementReportQuery({ getDefaultFilters, formatError }: UseSettlementReportQueryOptions) {
  const [settlementReport, setSettlementReport] = useState<SalesSettlementReport | null>(null);
  const [settlementReportLoading, setSettlementReportLoading] = useState(false);
  const [settlementReportError, setSettlementReportError] = useState<string | null>(null);
  const [settlementReportMessage, setSettlementReportMessage] = useState<string | null>(null);
  const getDefaultFiltersRef = useLatestRef(getDefaultFilters);
  const formatErrorRef = useLatestRef(formatError);

  async function loadSettlementReport(filters?: SettlementReportFilters, shouldCommit?: () => boolean) {
    setSettlementReportLoading(true);
    setSettlementReportError(null);
    setSettlementReportMessage(null);
    try {
      const effectiveFilters = filters ?? getDefaultFiltersRef.current();
      const params = new URLSearchParams();
      params.set("startDate", effectiveFilters.startDate);
      params.set("endDate", effectiveFilters.endDate);
      if (effectiveFilters.paymentMethod) {
        params.set("paymentMethod", effectiveFilters.paymentMethod);
      }
      if (effectiveFilters.productKeyword.trim()) {
        params.set("productKeyword", effectiveFilters.productKeyword.trim());
      }
      const response = await apiGet<SalesSettlementReport>(`/api/v1/settlements/sales-report?${params.toString()}`);
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setSettlementReport(response.data);
      setSettlementReportMessage(response.message);
    } catch (error) {
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setSettlementReportError(formatErrorRef.current(error));
    } finally {
      if (canCommitState(shouldCommit)) {
        setSettlementReportLoading(false);
      }
    }
  }

  function resetSettlementReportQuery() {
    setSettlementReport(null);
    setSettlementReportLoading(false);
    setSettlementReportError(null);
    setSettlementReportMessage(null);
  }

  return {
    settlementReport,
    settlementReportLoading,
    settlementReportError,
    settlementReportMessage,
    loadSettlementReport,
    resetSettlementReportQuery
  } as const;
}
