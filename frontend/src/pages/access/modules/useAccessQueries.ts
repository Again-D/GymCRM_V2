import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { AccessEventRow, AccessPresenceSummary } from "./types";

export function useAccessQueries(memberId?: number | null) {
  const presenceQuery = useQuery({
    queryKey: queryKeys.access.list({ scope: "presence" }),
    queryFn: async () => {
      const response = await apiGet<AccessPresenceSummary>("/api/v1/access/presence");
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const eventsQuery = useQuery({
    queryKey: queryKeys.access.list({ scope: "events", memberId: memberId ?? null }),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "100");
      if (memberId != null) {
        params.set("memberId", String(memberId));
      }
      const response = await apiGet<AccessEventRow[]>(
        `/api/v1/access/events?${params.toString()}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const { refetch: refetchPresence } = presenceQuery;
  const { refetch: refetchEvents } = eventsQuery;

  // We memoize the return object BUT specifically extract refetch which are stable from useQuery
  return useMemo(() => ({
    accessEvents: eventsQuery.data ?? [],
    accessPresence: presenceQuery.data ?? null,
    accessEventsLoading: eventsQuery.isFetching || eventsQuery.isPending,
    accessPresenceLoading: presenceQuery.isFetching || presenceQuery.isPending,
    accessQueryError:
      (eventsQuery.error ? toUserFacingErrorMessage(eventsQuery.error, "출입 이력을 불러오지 못했습니다.") : null) ||
      (presenceQuery.error ? toUserFacingErrorMessage(presenceQuery.error, "현재 입장 현황을 불러오지 못했습니다.") : null) ||
      null,
    refetchAccessPresence: refetchPresence,
    refetchAccessEvents: refetchEvents,
  }), [
    eventsQuery.data,
    eventsQuery.isFetching,
    eventsQuery.isPending,
    eventsQuery.error,
    presenceQuery.data,
    presenceQuery.isFetching,
    presenceQuery.isPending,
    presenceQuery.error,
    refetchPresence,
    refetchEvents
  ]);
}
