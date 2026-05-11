import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { SettlementReceivables, SettlementReceivablesFilters } from "./types";

export function useSettlementReceivablesQuery(filters: SettlementReceivablesFilters) {
  const query = useQuery({
    queryKey: queryKeys.settlements.list({
      scope: "receivables",
      baseDate: filters.baseDate,
      limit: filters.limit
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("baseDate", filters.baseDate);
      params.set("limit", String(filters.limit));
      const response = await apiGet<SettlementReceivables>(`/api/v1/settlements/receivables?${params.toString()}`);
      return {
        data: response.data,
        message: response.message
      };
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime
  });

  return useMemo(() => ({
    settlementReceivables: query.data?.data ?? null,
    settlementReceivablesLoading: query.isFetching || query.isPending,
    settlementReceivablesError: query.error
      ? toUserFacingErrorMessage(query.error, "미수금 현황을 불러오지 못했습니다.")
      : null,
    settlementReceivablesMessage: query.data?.message ?? null,
    refetchSettlementReceivables: query.refetch
  }), [query.data, query.error, query.isFetching, query.isPending, query.refetch]);
}
