import { useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";
import type { CrmFilters, CrmMessageHistoryResponse, CrmMessageHistoryRow } from "./useCrmWorkspaceState";

type UseCrmHistoryQueryOptions = {
  getDefaultFilters: () => CrmFilters;
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

export function useCrmHistoryQuery({ getDefaultFilters, formatError }: UseCrmHistoryQueryOptions) {
  const [crmHistoryRows, setCrmHistoryRows] = useState<CrmMessageHistoryRow[]>([]);
  const [crmHistoryLoading, setCrmHistoryLoading] = useState(false);
  const [crmHistoryError, setCrmHistoryError] = useState<string | null>(null);
  const getDefaultFiltersRef = useLatestRef(getDefaultFilters);
  const formatErrorRef = useLatestRef(formatError);

  async function loadCrmHistory(filters?: CrmFilters, shouldCommit?: () => boolean) {
    setCrmHistoryLoading(true);
    setCrmHistoryError(null);
    try {
      const effectiveFilters = filters ?? getDefaultFiltersRef.current();
      const params = new URLSearchParams();
      const parsedLimit = Number.parseInt(effectiveFilters.limit, 10);
      params.set("limit", Number.isFinite(parsedLimit) ? String(parsedLimit) : "100");
      if (effectiveFilters.sendStatus) {
        params.set("sendStatus", effectiveFilters.sendStatus);
      }
      const response = await apiGet<CrmMessageHistoryResponse>(`/api/v1/crm/messages?${params.toString()}`);
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setCrmHistoryRows(response.data.rows);
    } catch (error) {
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setCrmHistoryError(formatErrorRef.current(error));
    } finally {
      if (canCommitState(shouldCommit)) {
        setCrmHistoryLoading(false);
      }
    }
  }

  function resetCrmHistoryQuery() {
    setCrmHistoryRows([]);
    setCrmHistoryLoading(false);
    setCrmHistoryError(null);
  }

  return {
    crmHistoryRows,
    crmHistoryLoading,
    crmHistoryError,
    loadCrmHistory,
    resetCrmHistoryQuery
  } as const;
}
