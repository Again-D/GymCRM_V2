import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { GxScheduleSnapshot } from "./types";

export function useGxScheduleSnapshotQuery(month: string) {
  const query = useQuery({
    queryKey: queryKeys.gxSchedules.list({ month }),
    queryFn: async () => {
      const response = await apiGet<GxScheduleSnapshot>(
        `/api/v1/reservations/gx/snapshot?month=${month}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  return useMemo(() => ({
    snapshot: query.data ?? null,
    loading: query.isFetching || query.isPending,
    error: query.error ? toUserFacingErrorMessage(query.error, "GX 스케줄 스냅샷을 불러오지 못했습니다.") : null,
    refetch: query.refetch,
  }), [
    query.data,
    query.isFetching,
    query.isPending,
    query.error,
    query.refetch
  ]);
}
