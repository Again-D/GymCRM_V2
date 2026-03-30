import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { ReservationScheduleSummary } from "../../members/modules/types";

export function useReservationSchedulesQuery() {
  const [isEnabled, setIsEnabled] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.reservations.list({ scope: "schedules" }),
    queryFn: async () => {
      const response = await apiGet<ReservationScheduleSummary[]>(
        "/api/v1/reservations/schedules",
      );
      const now = Date.now();
      return response.data.filter((schedule) => {
        const startAt = new Date(schedule.startAt).getTime();
        return Number.isFinite(startAt) && startAt > now;
      });
    },
    enabled: isEnabled,
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const loadReservationSchedules = useCallback(async () => {
    setIsEnabled(true);
  }, []);

  const resetReservationSchedulesQuery = useCallback(() => {
    setIsEnabled(false);
  }, []);

  return {
    reservationSchedules: query.data ?? [],
    reservationSchedulesLoading: query.isFetching || query.isPending,
    reservationSchedulesError: query.error ? toUserFacingErrorMessage(query.error, "예약 스케줄을 불러오지 못했습니다.") : null,
    loadReservationSchedules,
    resetReservationSchedulesQuery,
  } as const;
}
