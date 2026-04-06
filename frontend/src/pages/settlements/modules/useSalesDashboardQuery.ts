import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { SalesDashboard } from "./types";

type SalesDashboardFilters = {
  baseDate: string;
  expiringWithinDays: number;
};

export function useSalesDashboardQuery(filters: SalesDashboardFilters) {
  const query = useQuery({
    queryKey: queryKeys.settlements.list({
      scope: "sales-dashboard",
      baseDate: filters.baseDate,
      expiringWithinDays: filters.expiringWithinDays
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("baseDate", filters.baseDate);
      params.set("expiringWithinDays", String(filters.expiringWithinDays));
      const response = await apiGet<SalesDashboard>(`/api/v1/settlements/sales-dashboard?${params.toString()}`);
      return {
        data: response.data,
        message: response.message
      };
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime
  });

  return useMemo(() => ({
    salesDashboard: query.data?.data ?? null,
    salesDashboardLoading: query.isFetching || query.isPending,
    salesDashboardError: query.error
      ? toUserFacingErrorMessage(query.error, "매출 대시보드를 불러오지 못했습니다.")
      : null,
    salesDashboardMessage: query.data?.message ?? null,
    refetchSalesDashboard: query.refetch
  }), [query.data, query.error, query.isFetching, query.isPending, query.refetch]);
}
