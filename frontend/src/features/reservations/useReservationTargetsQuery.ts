import { useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";

export type ReservationTargetSummary = {
  memberId: number;
  memberCode: string;
  memberName: string;
  phone: string;
  reservableMembershipCount: number;
  membershipExpiryDate: string | null;
  confirmedReservationCount: number;
};

type UseReservationTargetsQueryOptions = {
  formatError: (error: unknown) => string;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useReservationTargetsQuery({ formatError }: UseReservationTargetsQueryOptions) {
  const [reservationTargets, setReservationTargets] = useState<ReservationTargetSummary[]>([]);
  const [reservationTargetsKeyword, setReservationTargetsKeyword] = useState("");
  const [reservationTargetsLoading, setReservationTargetsLoading] = useState(false);
  const [reservationTargetsError, setReservationTargetsError] = useState<string | null>(null);
  const formatErrorRef = useLatestRef(formatError);
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
      setReservationTargetsError(formatErrorRef.current(error));
    } finally {
      if (requestIdRef.current === requestId) {
        setReservationTargetsLoading(false);
      }
    }
  }

  function resetReservationTargetsQuery() {
    requestIdRef.current += 1;
    setReservationTargets([]);
    setReservationTargetsKeyword("");
    setReservationTargetsLoading(false);
    setReservationTargetsError(null);
  }

  return {
    reservationTargets,
    reservationTargetsKeyword,
    setReservationTargetsKeyword,
    reservationTargetsLoading,
    reservationTargetsError,
    loadReservationTargets,
    resetReservationTargetsQuery
  } as const;
}
