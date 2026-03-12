import { useRef, useState } from "react";

import { apiGet } from "../../../api/client";

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
  const [reservationTargets, setReservationTargets] = useState<ReservationTargetSummary[]>([]);
  const [reservationTargetsKeyword, setReservationTargetsKeyword] = useState("");
  const [reservationTargetsLoading, setReservationTargetsLoading] = useState(false);
  const [reservationTargetsError, setReservationTargetsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

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
      const response = await apiGet<ReservationTargetSummary[]>(
        `/api/v1/reservations/targets${params.size > 0 ? `?${params.toString()}` : ""}`
      );
      if (requestIdRef.current !== requestId) {
        return;
      }
      setReservationTargets(response.data);
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
