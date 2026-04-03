import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { SettlementRecentAdjustment, SettlementReportFilters } from "./types";

export function useSettlementRecentAdjustmentsQuery(filters: SettlementReportFilters, limit = 5) {
  const query = useQuery({
    queryKey: queryKeys.settlements.list({
      scope: "recent-adjustments",
      startDate: filters.startDate,
      endDate: filters.endDate,
      paymentMethod: filters.paymentMethod,
      productKeyword: filters.productKeyword.trim(),
      limit
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", filters.startDate);
      params.set("endDate", filters.endDate);
      params.set("limit", String(limit));
      if (filters.paymentMethod) {
        params.set("paymentMethod", filters.paymentMethod);
      }
      if (filters.productKeyword.trim()) {
        params.set("productKeyword", filters.productKeyword.trim());
      }
      const response = await apiGet<SettlementRecentAdjustment[]>(
        `/api/v1/settlements/sales-report/recent-adjustments?${params.toString()}`
      );
      return {
        data: response.data,
        message: response.message
      };
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime
  });

  return useMemo(() => ({
    recentAdjustments: query.data?.data ?? [],
    recentAdjustmentsLoading: query.isFetching || query.isPending,
    recentAdjustmentsError: query.error
      ? toUserFacingErrorMessage(query.error, "최근 환불/취소 목록을 불러오지 못했습니다.")
      : null,
    recentAdjustmentsMessage: query.data?.message ?? null,
    refetchRecentAdjustments: query.refetch
  }), [query.data, query.error, query.isFetching, query.isPending, query.refetch]);
}
