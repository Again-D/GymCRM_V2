import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { ReservationScheduleSummary } from "../../members/modules/types";

function normalizeScheduleIds(scheduleIds?: number[]) {
  return Array.from(
    new Set(
      (scheduleIds ?? []).filter(
        (scheduleId): scheduleId is number =>
          Number.isInteger(scheduleId) && scheduleId > 0,
      ),
    ),
  ).sort((a, b) => a - b);
}

export function useReservationSchedulesQuery() {
  const [requestState, setRequestState] = useState<{
    isEnabled: boolean;
    scheduleIds: number[];
  }>({
    isEnabled: false,
    scheduleIds: [],
  });

  const query = useQuery({
    queryKey: queryKeys.reservations.list({
      scope: "schedules",
      scheduleIds: requestState.scheduleIds,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      requestState.scheduleIds.forEach((scheduleId) => {
        params.append("scheduleIds", String(scheduleId));
      });
      const response = await apiGet<ReservationScheduleSummary[]>(
        `/api/v1/reservations/schedules${params.size > 0 ? `?${params.toString()}` : ""}`,
      );
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: requestState.isEnabled,
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const loadReservationSchedules = useCallback(async (scheduleIds?: number[]) => {
    const nextScheduleIds = normalizeScheduleIds(scheduleIds);
    setRequestState((prev) => {
      if (
        prev.isEnabled &&
        prev.scheduleIds.length === nextScheduleIds.length &&
        prev.scheduleIds.every((scheduleId, index) => scheduleId === nextScheduleIds[index])
      ) {
        return prev;
      }
      return {
        isEnabled: true,
        scheduleIds: nextScheduleIds,
      };
    });
  }, []);

  const resetReservationSchedulesQuery = useCallback(() => {
    setRequestState({
      isEnabled: false,
      scheduleIds: [],
    });
  }, []);

  return {
    reservationSchedules: query.data ?? [],
    reservationSchedulesLoading: query.isFetching || query.isPending,
    reservationSchedulesError: query.error ? toUserFacingErrorMessage(query.error, "예약 스케줄을 불러오지 못했습니다.") : null,
    loadReservationSchedules,
    resetReservationSchedulesQuery,
  } as const;
}
