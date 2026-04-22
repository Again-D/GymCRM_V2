import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { LockerAssignment, LockerFilters, LockerSlot } from "./types";

export function useLockerQueries(filters?: LockerFilters, activeOnly = false) {
  const slotsQuery = useQuery({
    queryKey: queryKeys.lockers.list({ 
      scope: "lockerSlots", 
      status: filters?.lockerStatus, 
      zone: filters?.lockerZone?.trim() 
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.lockerStatus) {
        params.set("lockerStatus", filters.lockerStatus);
      }
      if (filters?.lockerZone?.trim()) {
        params.set("lockerZone", filters.lockerZone.trim());
      }
      const query = params.toString();
      const response = await apiGet<LockerSlot[]>(
        `/api/v1/lockers${query ? `?${query}` : ""}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const assignmentsQuery = useQuery({
    queryKey: queryKeys.lockers.list({ scope: "lockerAssignments", activeOnly }),
    queryFn: async () => {
      const response = await apiGet<LockerAssignment[]>(
        `/api/v1/lockers/assignments?activeOnly=${activeOnly}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const { refetch: refetchSlots } = slotsQuery;
  const { refetch: refetchAssignments } = assignmentsQuery;

  return useMemo(() => ({
    lockerSlots: slotsQuery.data ?? [],
    lockerSlotsLoading: slotsQuery.isFetching || slotsQuery.isPending,
    lockerAssignments: assignmentsQuery.data ?? [],
    lockerAssignmentsLoading: assignmentsQuery.isFetching || assignmentsQuery.isPending,
    lockerQueryError:
      (slotsQuery.error ? toUserFacingErrorMessage(slotsQuery.error, "라커 슬롯을 불러오지 못했습니다.") : null) ||
      (assignmentsQuery.error ? toUserFacingErrorMessage(assignmentsQuery.error, "라커 배정 목록을 불러오지 못했습니다.") : null),
    refetchLockerSlots: refetchSlots,
    refetchLockerAssignments: refetchAssignments,
  }), [
    slotsQuery.data,
    slotsQuery.isFetching,
    slotsQuery.isPending,
    slotsQuery.error,
    assignmentsQuery.data,
    assignmentsQuery.isFetching,
    assignmentsQuery.isPending,
    assignmentsQuery.error,
    refetchSlots,
    refetchAssignments
  ]);
}
