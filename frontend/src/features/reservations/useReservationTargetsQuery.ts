import { useEffect, useRef, useState } from "react";
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
  enabled?: boolean;
  invalidationVersion?: number;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useReservationTargetsQuery({
  formatError,
  enabled = true,
  invalidationVersion = 0
}: UseReservationTargetsQueryOptions) {
  const [reservationTargets, setReservationTargets] = useState<ReservationTargetSummary[]>([]);
  const [reservationTargetsKeyword, setReservationTargetsKeyword] = useState("");
  const [reservationTargetsLoading, setReservationTargetsLoading] = useState(false);
  const [reservationTargetsError, setReservationTargetsError] = useState<string | null>(null);
  const formatErrorRef = useLatestRef(formatError);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const lastKeywordRef = useRef<string | undefined>(undefined);

  async function loadReservationTargets(keyword?: string) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    hasLoadedRef.current = true;
    setReservationTargetsLoading(true);
    setReservationTargetsError(null);

    const effectiveKeyword = keyword ?? reservationTargetsKeyword;
    lastKeywordRef.current = effectiveKeyword;
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
    hasLoadedRef.current = false;
    lastKeywordRef.current = undefined;
    setReservationTargets([]);
    setReservationTargetsKeyword("");
    setReservationTargetsLoading(false);
    setReservationTargetsError(null);
  }

  const loadReservationTargetsRef = useLatestRef(loadReservationTargets);

  useEffect(() => {
    if (!enabled || !hasLoadedRef.current) {
      return;
    }
    void loadReservationTargetsRef.current(lastKeywordRef.current);
  }, [enabled, invalidationVersion]);

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
