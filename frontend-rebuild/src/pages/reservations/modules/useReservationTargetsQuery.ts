import { useRef, useState } from "react";

import { apiGet } from "../../../api/client";
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

export function useReservationTargetsQuery() {
  const { authUser } = useAuthState();
  const [reservationTargets, setReservationTargets] = useState<ReservationTargetSummary[]>([]);
  const [reservationTargetsKeyword, setReservationTargetsKeyword] = useState("");
  const [reservationTargetsLoading, setReservationTargetsLoading] = useState(false);
  const [reservationTargetsError, setReservationTargetsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, ReservationTargetSummary[]>());
  const inflightRef = useRef(new Map<string, Promise<ReservationTargetSummary[]>>());

  async function loadReservationTargets(keyword?: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setReservationTargetsLoading(true);
    setReservationTargetsError(null);

    const effectiveKeyword = keyword ?? reservationTargetsKeyword;
    const params = new URLSearchParams();
    if (effectiveKeyword.trim()) {
      params.set("keyword", effectiveKeyword.trim());
    }

    try {
      const query = params.toString();
      const cacheKey = `${authUser?.role ?? "anon"}:${authUser?.userId ?? "none"}:${query}`;
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
          .then((response) => filterMemberIdsForAuth(response.data, authUser))
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
  }

  return {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    reservationTargetsLoading,
    reservationTargetsError,
    loadReservationTargets
  } as const;
}
