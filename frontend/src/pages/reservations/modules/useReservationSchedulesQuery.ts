import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import type { ReservationScheduleSummary } from "../../members/modules/types";

export function useReservationSchedulesQuery() {
  const [reservationSchedules, setReservationSchedules] = useState<
    ReservationScheduleSummary[]
  >([]);
  const [reservationSchedulesLoading, setReservationSchedulesLoading] =
    useState(false);
  const [reservationSchedulesError, setReservationSchedulesError] = useState<
    string | null
  >(null);
  const requestIdRef = useRef(0);

  const loadReservationSchedules = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setReservationSchedulesLoading(true);
    setReservationSchedulesError(null);

    try {
      const response = await apiGet<ReservationScheduleSummary[]>(
        "/api/v1/reservations/schedules",
      );
      if (requestIdRef.current !== requestId) {
        return;
      }
      setReservationSchedules(response.data);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setReservationSchedules((prev) => (prev.length === 0 ? prev : []));
      setReservationSchedulesError(
        error instanceof Error
          ? error.message
          : "예약 스케줄을 불러오지 못했습니다.",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setReservationSchedulesLoading(false);
      }
    }
  }, []);

  const resetReservationSchedulesQuery = useCallback(() => {
    requestIdRef.current += 1;
    setReservationSchedules((prev) => (prev.length === 0 ? prev : []));
    setReservationSchedulesLoading(false);
    setReservationSchedulesError(null);
  }, []);

  return {
    reservationSchedules,
    reservationSchedulesLoading,
    reservationSchedulesError,
    loadReservationSchedules,
    resetReservationSchedulesQuery,
  } as const;
}
