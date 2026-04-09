import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { useAuthState } from "../../../app/auth";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { TrainerMonthlyPtSummary } from "./types";

export function useTrainerMonthlyPtSummaryQuery(settlementMonth: string) {
  const { authUser } = useAuthState();
  const normalizedMonth = settlementMonth.trim();
  const isQueryEnabled = /^\d{4}-\d{2}$/.test(normalizedMonth);

  const query = useQuery({
    queryKey: queryKeys.settlements.list({
      scope: "trainer-payroll-my-summary",
      settlementMonth: normalizedMonth,
      trainerUserId: authUser?.userId ?? ""
    }),
    enabled: isQueryEnabled,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("settlementMonth", normalizedMonth);
      if (authUser?.userId != null) {
        params.set("trainerUserId", String(authUser.userId));
      }
      const response = await apiGet<TrainerMonthlyPtSummary>(
        `/api/v1/settlements/trainer-payroll/my-summary?${params.toString()}`
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
    trainerMonthlyPtSummary: query.data?.data ?? null,
    trainerMonthlyPtSummaryLoading: query.isFetching || (isQueryEnabled && query.isPending),
    trainerMonthlyPtSummaryError: query.error
      ? toUserFacingErrorMessage(query.error, "월간 완료 PT 수업 수 조회에 실패했습니다.")
      : null,
    trainerMonthlyPtSummaryMessage: query.data?.message ?? null,
    refetchTrainerMonthlyPtSummary: query.refetch
  }), [isQueryEnabled, query.data, query.error, query.isFetching, query.isPending, query.refetch]);
}
