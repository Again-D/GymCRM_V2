import { useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import type { SettlementReport, SettlementReportFilters } from "./types";

type UseSettlementReportQueryOptions = {
  getDefaultFilters: () => SettlementReportFilters;
};

export function useSettlementReportQuery({ getDefaultFilters }: UseSettlementReportQueryOptions) {
  const [settlementReport, setSettlementReport] = useState<SettlementReport | null>(null);
  const [settlementReportLoading, setSettlementReportLoading] = useState(false);
  const [settlementReportError, setSettlementReportError] = useState<string | null>(null);
  const [settlementReportMessage, setSettlementReportMessage] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, SettlementReport>());
  const inflightRef = useRef(new Map<string, Promise<{ data: SettlementReport; message: string }>>());
  const settlementReportVersion = useQueryInvalidationVersion("settlementReport");
  const productsVersion = useQueryInvalidationVersion("products");

  async function loadSettlementReport(filters?: SettlementReportFilters) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSettlementReportLoading(true);
    setSettlementReportError(null);
    setSettlementReportMessage(null);

    try {
      const effectiveFilters = filters ?? getDefaultFilters();
      const params = new URLSearchParams();
      params.set("startDate", effectiveFilters.startDate);
      params.set("endDate", effectiveFilters.endDate);
      if (effectiveFilters.paymentMethod) {
        params.set("paymentMethod", effectiveFilters.paymentMethod);
      }
      if (effectiveFilters.productKeyword.trim()) {
        params.set("productKeyword", effectiveFilters.productKeyword.trim());
      }
      const query = params.toString();
      const cacheKey = `${productsVersion}:${settlementReportVersion}:${query}`;
      if (cacheRef.current.has(cacheKey)) {
        if (requestIdRef.current !== requestId) return;
        setSettlementReport(cacheRef.current.get(cacheKey) ?? null);
        setSettlementReportMessage("mock ok");
        return;
      }

      let responsePromise = inflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<SettlementReport>(`/api/v1/settlements/sales-report?${query}`)
          .then((response) => ({
            data: response.data,
            message: response.message
          }))
          .finally(() => inflightRef.current.delete(cacheKey));
        inflightRef.current.set(cacheKey, responsePromise);
      }

      const nextResponse = await responsePromise;
      if (requestIdRef.current !== requestId) return;
      cacheRef.current.set(cacheKey, nextResponse.data);
      setSettlementReport(nextResponse.data);
      setSettlementReportMessage(nextResponse.message);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setSettlementReport(null);
      setSettlementReportError(error instanceof Error ? error.message : "정산 리포트를 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setSettlementReportLoading(false);
      }
    }
  }

  function resetSettlementReportQuery() {
    requestIdRef.current += 1;
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
