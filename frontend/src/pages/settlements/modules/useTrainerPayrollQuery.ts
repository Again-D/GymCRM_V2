import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { TrainerPayrollQuery, TrainerPayrollReport } from "./types";

export function useTrainerPayrollQuery(queryInput: TrainerPayrollQuery | null) {
  const query = useQuery({
    queryKey: queryKeys.settlements.list({
      scope: "trainer-payroll",
      settlementMonth: queryInput?.settlementMonth ?? "",
      sessionUnitPrice: queryInput?.sessionUnitPrice ?? ""
    }),
    enabled: queryInput != null,
    queryFn: async () => {
      if (!queryInput) {
        return {
          data: null,
          message: null
        };
      }
      const params = new URLSearchParams();
      params.set("settlementMonth", queryInput.settlementMonth);
      params.set("sessionUnitPrice", String(queryInput.sessionUnitPrice));
      const response = await apiGet<TrainerPayrollReport>(
        `/api/v1/settlements/trainer-payroll?${params.toString()}`
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
    trainerPayroll: query.data?.data ?? null,
    trainerPayrollLoading: query.isFetching || query.isPending,
    trainerPayrollError: query.error
      ? toUserFacingErrorMessage(query.error, "트레이너 정산 조회에 실패했습니다.")
      : null,
    trainerPayrollMessage: query.data?.message ?? null,
    refetchTrainerPayroll: query.refetch
  }), [query.data, query.error, query.isFetching, query.isPending, query.refetch]);
}
