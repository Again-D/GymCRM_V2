import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet, isMockApiMode } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type {
  TrainerAvailabilityScope,
  TrainerAvailabilitySnapshot,
} from "./types";

function getAvailabilityPath(scope: TrainerAvailabilityScope, month: string) {
  if (scope.type === "me") {
    return `/api/v1/trainers/me/availability?month=${month}`;
  }
  return `/api/v1/trainers/${scope.trainerUserId}/availability?month=${month}`;
}

export function useTrainerAvailabilityQuery(
  scope: TrainerAvailabilityScope | null,
  month: string,
) {
  const query = useQuery({
    queryKey: scope 
      ? queryKeys.trainerAvailability.list({ scope, month }) 
      : [],
    queryFn: async () => {
      if (!scope) return null;
      if (isMockApiMode() && scope.type === "me") {
        const { getMockTrainerAvailabilitySnapshot } = await import("../../../api/mockData");
        return getMockTrainerAvailabilitySnapshot(scope.userId, month);
      }
      const response = await apiGet<TrainerAvailabilitySnapshot>(
        getAvailabilityPath(scope, month),
      );
      return response.data;
    },
    enabled: !!scope,
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  return useMemo(() => ({
    snapshot: query.data ?? null,
    loading: query.isFetching || query.isPending,
    error: query.error ? toUserFacingErrorMessage(query.error, "트레이너 스케줄을 불러오지 못했습니다.") : null,
    refetch: query.refetch,
  }), [
    query.data,
    query.isFetching,
    query.isPending,
    query.error,
    query.refetch
  ]);
}
