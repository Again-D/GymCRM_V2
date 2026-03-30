import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { toUserFacingErrorMessage } from "../../../app/uiError";
import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import type { PtReservationCandidatesPayload } from "../../members/modules/types";

type LoadPtReservationCandidatesInput = {
  membershipId: number;
  trainerUserId: number;
  date: string;
};

export function usePtReservationCandidatesQuery() {
  const [params, setParams] = useState<LoadPtReservationCandidatesInput | null>(null);

  const query = useQuery({
    queryKey: queryKeys.reservations.list({ 
      scope: "pt-candidates", 
      membershipId: params?.membershipId,
      trainerUserId: params?.trainerUserId,
      date: params?.date 
    }),
    queryFn: async () => {
      if (!params) return null;
      const searchParams = new URLSearchParams({
        membershipId: String(params.membershipId),
        trainerUserId: String(params.trainerUserId),
        date: params.date,
      });
      const response = await apiGet<PtReservationCandidatesPayload>(
        `/api/v1/reservations/pt-candidates?${searchParams.toString()}`,
      );
      return response.data;
    },
    enabled: params !== null,
    staleTime: queryPolicies.search.staleTime,
    gcTime: queryPolicies.search.gcTime,
  });

  const loadPtReservationCandidates = useCallback(async (input: LoadPtReservationCandidatesInput) => {
    setParams(input);
  }, []);

  const resetPtReservationCandidatesQuery = useCallback(() => {
    setParams(null);
  }, []);

  return {
    ptReservationCandidates: query.data ?? null,
    ptReservationCandidatesLoading: query.isFetching || query.isPending,
    ptReservationCandidatesError: query.error ? toUserFacingErrorMessage(query.error, "PT 예약 가능 시각을 불러오지 못했습니다.") : null,
    loadPtReservationCandidates,
    resetPtReservationCandidatesQuery,
  } as const;
}
