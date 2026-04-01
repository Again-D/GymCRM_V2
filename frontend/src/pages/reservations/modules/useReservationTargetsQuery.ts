import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { useAuthState } from "../../../app/auth";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import { filterMemberIdsForAuth } from "../../member-context/modules/trainerScope";

export type ReservationTargetSummary = {
  memberId: number;
  memberCode: string;
  memberName: string;
  phone: string;
  reservableMembershipCount: number;
  membershipExpiryDate: string | null;
  confirmedReservationCount: number;
};

export function useReservationTargetsQuery() {
  const { authUser } = useAuthState();
  const [keyword, setKeyword] = useState("");

  const query = useQuery({
    queryKey: queryKeys.reservations.list({ scope: "targets", keyword: keyword.trim() }),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (keyword.trim()) {
        searchParams.set("keyword", keyword.trim());
      }
      const queryString = searchParams.toString();
      const response = await apiGet<ReservationTargetSummary[]>(
        `/api/v1/reservations/targets${queryString ? `?${queryString}` : ""}`,
      );
      return filterMemberIdsForAuth(response.data, authUser);
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const loadReservationTargets = useCallback(async (newKeyword?: string) => {
    if (newKeyword !== undefined) {
      setKeyword(newKeyword);
    }
  }, []);

  return {
    reservationTargets: query.data ?? [],
    reservationTargetsKeyword: keyword,
    setReservationTargetsKeyword: setKeyword,
    reservationTargetsLoading: query.isFetching || query.isPending,
    reservationTargetsError: query.error ? toUserFacingErrorMessage(query.error, "예약 대상 회원을 불러오지 못했습니다.") : null,
    loadReservationTargets,
  } as const;
}
