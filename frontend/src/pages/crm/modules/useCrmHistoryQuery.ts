import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { CrmFilters, CrmHistoryRow } from "./types";

type CrmHistoryResponse = {
  rows: CrmHistoryRow[];
};

export function useCrmHistoryQuery(filters: CrmFilters) {
  const query = useQuery({
    queryKey: queryKeys.crm.list({ sendStatus: filters.sendStatus, limit: filters.limit }),
    queryFn: async () => {
      const params = new URLSearchParams();
      const parsedLimit = Number.parseInt(filters.limit, 10);
      params.set(
        "limit",
        Number.isFinite(parsedLimit) ? String(parsedLimit) : "100",
      );
      if (filters.sendStatus) {
        params.set("sendStatus", filters.sendStatus);
      }
      const response = await apiGet<CrmHistoryResponse>(
        `/api/v1/crm/messages?${params.toString()}`,
      );
      return response.data.rows;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const { refetch } = query;

  return useMemo(() => ({
    crmHistoryRows: query.data ?? [],
    crmHistoryLoading: query.isFetching || query.isPending,
    crmHistoryError: query.error ? toUserFacingErrorMessage(query.error, "CRM 발송 이력을 불러오지 못했습니다.") : null,
    refetchCrmHistory: refetch,
  }), [
    query.data,
    query.isFetching,
    query.isPending,
    query.error,
    refetch
  ]);
}
