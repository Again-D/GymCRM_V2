import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { CenterProfile } from "./types";

export function useCenterProfileQuery() {
  const query = useQuery({
    queryKey: queryKeys.centers.detail("me"),
    queryFn: async () => {
      const response = await apiGet<CenterProfile>("/api/v1/centers/me");
      return response.data;
    },
    staleTime: queryPolicies.detail.staleTime,
    gcTime: queryPolicies.detail.gcTime,
  });

  return useMemo(
    () => ({
      centerProfile: query.data ?? null,
      centerProfileLoading: query.isPending || query.isFetching,
      centerProfileError: query.error
        ? toUserFacingErrorMessage(
            query.error,
            "센터 프로필을 불러오지 못했습니다.",
          )
        : null,
      refetchCenterProfile: query.refetch,
    }),
    [query.data, query.error, query.isFetching, query.isPending, query.refetch],
  );
}
