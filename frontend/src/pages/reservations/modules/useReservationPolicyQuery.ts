import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { ReservationPolicySummary } from "./types";

export function useReservationPolicyQuery() {
  const query = useQuery({
    queryKey: queryKeys.reservations.detail("policy"),
    queryFn: async () => {
      const response = await apiGet<ReservationPolicySummary>("/api/v1/reservations/policy");
      return response.data;
    },
    staleTime: queryPolicies.reference.staleTime,
    gcTime: queryPolicies.reference.gcTime,
    retry: false,
  });

  return useMemo(
    () => ({
      reservationPolicy: query.data ?? null,
      reservationPolicyLoading: query.isFetching || query.isPending,
      reservationPolicyError: query.error
        ? toUserFacingErrorMessage(query.error, "예약 정책을 불러오지 못했습니다.")
        : null,
      refetchReservationPolicy: query.refetch,
    }),
    [
      query.data,
      query.error,
      query.isFetching,
      query.isPending,
      query.refetch,
    ],
  );
}
