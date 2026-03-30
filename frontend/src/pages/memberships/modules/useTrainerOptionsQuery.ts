import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";

import { toUserFacingErrorMessage } from "../../../app/uiError";
import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";

export type TrainerOption = {
  userId: number;
  centerId: number;
  displayName: string;
};

export function useTrainerOptionsQuery() {
  const query = useQuery({
    queryKey: queryKeys.trainers.lists(),
    queryFn: async () => {
      const response = await apiGet<TrainerOption[]>("/api/v1/auth/trainers");
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
  });

  const loadTrainerOptions = useCallback(async () => {
    // No-op for compatibility as useQuery handles it
  }, []);

  const resetTrainerOptions = useCallback(() => {
    // No-op for compatibility as useQuery handles it
  }, []);

  return {
    trainerOptions: query.data ?? [],
    trainerOptionsLoading: query.isFetching || query.isPending,
    trainerOptionsError: query.error ? toUserFacingErrorMessage(query.error, "트레이너 목록을 불러오지 못했습니다.") : null,
    loadTrainerOptions,
    resetTrainerOptions,
  } as const;
}
