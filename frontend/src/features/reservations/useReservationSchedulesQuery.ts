import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";
import type { ReservationScheduleSummary } from "./useReservationWorkspaceState";

type UseReservationSchedulesQueryOptions = {
  formatError: (error: unknown) => string;
  enabled?: boolean;
  invalidationVersion?: number;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function canCommitState(shouldCommit?: () => boolean) {
  return shouldCommit?.() ?? true;
}

export function useReservationSchedulesQuery({
  formatError,
  enabled = true,
  invalidationVersion = 0
}: UseReservationSchedulesQueryOptions) {
  const [reservationSchedules, setReservationSchedules] = useState<ReservationScheduleSummary[]>([]);
  const [reservationSchedulesLoading, setReservationSchedulesLoading] = useState(false);
  const [reservationSchedulesError, setReservationSchedulesError] = useState<string | null>(null);
  const formatErrorRef = useLatestRef(formatError);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  async function loadReservationSchedules(shouldCommit?: () => boolean) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    hasLoadedRef.current = true;
    setReservationSchedulesLoading(true);
    setReservationSchedulesError(null);
    try {
      const response = await apiGet<ReservationScheduleSummary[]>("/api/v1/reservations/schedules");
      if (requestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setReservationSchedules(response.data);
    } catch (error) {
      if (requestIdRef.current !== requestId || !canCommitState(shouldCommit)) {
        return;
      }
      setReservationSchedulesError(formatErrorRef.current(error));
    } finally {
      if (requestIdRef.current === requestId && canCommitState(shouldCommit)) {
        setReservationSchedulesLoading(false);
      }
    }
  }

  function resetReservationSchedulesQuery() {
    requestIdRef.current += 1;
    hasLoadedRef.current = false;
    setReservationSchedules([]);
    setReservationSchedulesLoading(false);
    setReservationSchedulesError(null);
  }

  const loadReservationSchedulesRef = useLatestRef(loadReservationSchedules);

  useEffect(() => {
    if (!enabled || !hasLoadedRef.current) {
      return;
    }
    void loadReservationSchedulesRef.current();
  }, [enabled, invalidationVersion]);

  return {
    reservationSchedules,
    reservationSchedulesLoading,
    reservationSchedulesError,
    loadReservationSchedules,
    resetReservationSchedulesQuery
  } as const;
}
