import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import type { CrmFilters, CrmHistoryRow } from "./types";

type CrmHistoryResponse = {
  rows: CrmHistoryRow[];
};

export function useCrmHistoryQuery() {
  const [crmHistoryRows, setCrmHistoryRows] = useState<CrmHistoryRow[]>([]);
  const [crmHistoryLoading, setCrmHistoryLoading] = useState(false);
  const [crmHistoryError, setCrmHistoryError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, CrmHistoryRow[]>());
  const inflightRef = useRef(new Map<string, Promise<CrmHistoryRow[]>>());
  const crmHistoryVersion = useQueryInvalidationVersion("crmHistory");

  const loadCrmHistory = useCallback(async (filters: CrmFilters) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setCrmHistoryLoading(true);
    setCrmHistoryError(null);

    try {
      const params = new URLSearchParams();
      const parsedLimit = Number.parseInt(filters.limit, 10);
      params.set("limit", Number.isFinite(parsedLimit) ? String(parsedLimit) : "100");
      if (filters.sendStatus) {
        params.set("sendStatus", filters.sendStatus);
      }

      const query = params.toString();
      const cacheKey = `${crmHistoryVersion}:${query}`;
      if (cacheRef.current.has(cacheKey)) {
        if (requestIdRef.current !== requestId) return;
        setCrmHistoryRows(cacheRef.current.get(cacheKey) ?? []);
        return;
      }

      let responsePromise = inflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<CrmHistoryResponse>(`/api/v1/crm/messages?${query}`)
          .then((response) => response.data.rows)
          .finally(() => inflightRef.current.delete(cacheKey));
        inflightRef.current.set(cacheKey, responsePromise);
      }

      const nextRows = await responsePromise;
      if (requestIdRef.current !== requestId) return;
      cacheRef.current.set(cacheKey, nextRows);
      setCrmHistoryRows(nextRows);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setCrmHistoryRows([]);
      setCrmHistoryError(error instanceof Error ? error.message : "CRM 이력을 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setCrmHistoryLoading(false);
      }
    }
  }, [crmHistoryVersion]);

  const resetCrmHistoryQuery = useCallback(() => {
    requestIdRef.current += 1;
    setCrmHistoryRows((prev) => (prev.length === 0 ? prev : []));
    setCrmHistoryLoading(false);
    setCrmHistoryError(null);
  }, []);

  return {
    crmHistoryRows,
    crmHistoryLoading,
    crmHistoryError,
    loadCrmHistory,
    resetCrmHistoryQuery
  } as const;
}
