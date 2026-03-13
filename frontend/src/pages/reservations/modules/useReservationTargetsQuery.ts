import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import { useAuthState } from "../../../app/auth";
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

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useReservationTargetsQuery() {
  const { authUser } = useAuthState();
  const [reservationTargets, setReservationTargets] = useState<ReservationTargetSummary[]>([]);
  const [reservationTargetsKeyword, setReservationTargetsKeyword] = useState("");
  const [reservationTargetsLoading, setReservationTargetsLoading] = useState(false);
  const [reservationTargetsError, setReservationTargetsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, ReservationTargetSummary[]>());
  const inflightRef = useRef(new Map<string, Promise<ReservationTargetSummary[]>>());
  const authUserRef = useLatestRef(authUser);
  const reservationTargetsKeywordRef = useLatestRef(reservationTargetsKeyword);
  const reservationTargetsVersion = useQueryInvalidationVersion("reservationTargets");

  const loadReservationTargets = useCallback(async (keyword?: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setReservationTargetsLoading(true);
    setReservationTargetsError(null);

    const effectiveKeyword = keyword ?? reservationTargetsKeywordRef.current;
    const params = new URLSearchParams();
    if (effectiveKeyword.trim()) {
      params.set("keyword", effectiveKeyword.trim());
    }

    try {
      const query = params.toString();
      const currentAuthUser = authUserRef.current;
      const cacheKey = `${currentAuthUser?.role ?? "anon"}:${currentAuthUser?.userId ?? "none"}:${reservationTargetsVersion}:${query}`;
      if (cacheRef.current.has(cacheKey)) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        setReservationTargets(cacheRef.current.get(cacheKey) ?? []);
        return;
      }

      let responsePromise = inflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<ReservationTargetSummary[]>(
          `/api/v1/reservations/targets${query ? `?${query}` : ""}`
        )
          .then((response) => filterMemberIdsForAuth(response.data, currentAuthUser))
          .finally(() => {
            inflightRef.current.delete(cacheKey);
          });
        inflightRef.current.set(cacheKey, responsePromise);
      }

      const scopedTargets = await responsePromise;
      if (requestIdRef.current !== requestId) {
        return;
      }
      cacheRef.current.set(cacheKey, scopedTargets);
      setReservationTargets(scopedTargets);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setReservationTargetsError(error instanceof Error ? error.message : "예약 대상 회원을 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setReservationTargetsLoading(false);
      }
    }
  }, [reservationTargetsVersion]);

  return {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    reservationTargetsLoading,
    reservationTargetsError,
    loadReservationTargets
  } as const;
}
