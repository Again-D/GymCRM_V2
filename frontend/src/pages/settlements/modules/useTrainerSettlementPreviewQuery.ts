import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { TrainerSettlementPreviewQuery, TrainerSettlementPreviewReport } from "./types";

type PreviewMode = "manager" | "trainer";

export function useTrainerSettlementPreviewQuery(
  mode: PreviewMode,
  queryInput: TrainerSettlementPreviewQuery | null
) {
  const isQueryEnabled = queryInput != null;
  const query = useQuery({
    queryKey: queryKeys.settlements.list({
      scope: mode === "manager" ? "trainer-settlement-preview" : "trainer-settlement-my-preview",
      trainerId: queryInput?.trainerId ?? "",
      settlementMonth: queryInput?.settlementMonth ?? ""
    }),
    enabled: isQueryEnabled,
    queryFn: async () => {
      if (!queryInput) {
        return {
          data: null,
          message: null
        };
      }
      const params = new URLSearchParams();
      params.set("settlementMonth", queryInput.settlementMonth);
      if (mode === "manager") {
        params.set("trainerId", queryInput.trainerId);
      }

      const response = await apiGet<TrainerSettlementPreviewReport>(
        mode === "manager"
          ? `/api/v1/settlements/preview?${params.toString()}`
          : `/api/v1/settlements/trainer-payroll/my-preview?${params.toString()}`
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
    trainerSettlementPreview: query.data?.data ?? null,
    trainerSettlementPreviewLoading: query.isFetching || (isQueryEnabled && query.isPending),
    trainerSettlementPreviewError: query.error
      ? toUserFacingErrorMessage(query.error, "트레이너 정산 preview 조회에 실패했습니다.")
      : null,
    trainerSettlementPreviewMessage: query.data?.message ?? null,
    refetchTrainerSettlementPreview: query.refetch
  }), [isQueryEnabled, query.data, query.error, query.isFetching, query.isPending, query.refetch]);
}
