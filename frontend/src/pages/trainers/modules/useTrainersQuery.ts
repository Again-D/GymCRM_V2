import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { TrainerFilters, TrainerSummary } from "./types";

export function useTrainersQuery(filters: TrainerFilters) {
  const query = useQuery({
    queryKey: queryKeys.trainers.list({ 
      centerId: filters.centerId, 
      keyword: filters.keyword?.trim(), 
      status: filters.status 
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.centerId > 0) {
        params.set("centerId", String(filters.centerId));
      }
      const trimmedKeyword = filters.keyword?.trim();
      if (trimmedKeyword) {
        params.set("keyword", trimmedKeyword);
      }
      if (filters.status) {
        params.set("status", filters.status);
      }
      const queryString = params.toString();
      const response = await apiGet<TrainerSummary[]>(
        `/api/v1/trainers${queryString ? `?${queryString}` : ""}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const { refetch } = query;

  return useMemo(() => ({
    trainers: query.data ?? [],
    trainersLoading: query.isFetching || query.isPending,
    trainersQueryError: query.error ? toUserFacingErrorMessage(query.error, "트레이너 목록을 불러오지 못했습니다.") : null,
    refetchTrainers: refetch,
  }), [
    query.data,
    query.isFetching,
    query.isPending,
    query.error,
    refetch
  ]);
}
