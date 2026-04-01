import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { SettlementReport, SettlementReportFilters } from "./types";

export function useSettlementReportQuery(filters: SettlementReportFilters) {
  const query = useQuery({
    queryKey: queryKeys.settlements.list({ 
      startDate: filters.startDate, 
      endDate: filters.endDate, 
      paymentMethod: filters.paymentMethod, 
      productKeyword: filters.productKeyword?.trim() 
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", filters.startDate);
      params.set("endDate", filters.endDate);
      if (filters.paymentMethod) {
        params.set("paymentMethod", filters.paymentMethod);
      }
      if (filters.productKeyword?.trim()) {
        params.set("productKeyword", filters.productKeyword.trim());
      }
      const response = await apiGet<SettlementReport>(
        `/api/v1/settlements/sales-report?${params.toString()}`,
      );
      return {
        data: response.data,
        message: response.message,
      };
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const { refetch } = query;

  return useMemo(() => ({
    settlementReport: query.data?.data ?? null,
    settlementReportLoading: query.isFetching || query.isPending,
    settlementReportError: query.error ? toUserFacingErrorMessage(query.error, "정산 리포트를 불러오지 못했습니다.") : null,
    settlementReportMessage: query.data?.message ?? null,
    refetchSettlementReport: refetch,
  }), [
    query.data,
    query.isFetching,
    query.isPending,
    query.error,
    refetch
  ]);
}
