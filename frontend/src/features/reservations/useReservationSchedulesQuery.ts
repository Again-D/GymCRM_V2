import { useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";
import type { ReservationScheduleSummary } from "./useReservationWorkspaceState";

type UseReservationSchedulesQueryOptions = {
  formatError: (error: unknown) => string;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

function canCommitState(shouldCommit?: () => boolean) {
  return shouldCommit?.() ?? true;
}

export function useReservationSchedulesQuery({ formatError }: UseReservationSchedulesQueryOptions) {
  const [reservationSchedules, setReservationSchedules] = useState<ReservationScheduleSummary[]>([]);
  const [reservationSchedulesLoading, setReservationSchedulesLoading] = useState(false);
  const [reservationSchedulesError, setReservationSchedulesError] = useState<string | null>(null);
  const formatErrorRef = useLatestRef(formatError);

  async function loadReservationSchedules(shouldCommit?: () => boolean) {
    setReservationSchedulesLoading(true);
    setReservationSchedulesError(null);
    try {
      const response = await apiGet<ReservationScheduleSummary[]>("/api/v1/reservations/schedules");
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setReservationSchedules(response.data);
    } catch (error) {
      if (!canCommitState(shouldCommit)) {
        return;
      }
      setReservationSchedulesError(formatErrorRef.current(error));
    } finally {
      if (canCommitState(shouldCommit)) {
        setReservationSchedulesLoading(false);
      }
    }
  }

  function resetReservationSchedulesQuery() {
    setReservationSchedules([]);
    setReservationSchedulesLoading(false);
    setReservationSchedulesError(null);
  }

  return {
    reservationSchedules,
    reservationSchedulesLoading,
    reservationSchedulesError,
    loadReservationSchedules,
    resetReservationSchedulesQuery
  } as const;
}
