import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { UserAccountsResponse, UserAccountFilters } from "./types";

export function useUserAccountsQuery(filters: UserAccountFilters) {
  const query = useQuery({
    queryKey: queryKeys.authUsers.list(filters as Record<string, unknown>),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.q.trim()) {
        params.set("q", filters.q.trim());
      }
      if (filters.roleCode) {
        params.set("roleCode", filters.roleCode);
      }
      if (filters.userStatus) {
        params.set("userStatus", filters.userStatus);
      }
      params.set("page", String(filters.page));
      params.set("size", String(filters.size));

      const response = await apiGet<UserAccountsResponse>(
        `/api/v1/auth/users?${params.toString()}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.search.staleTime,
    gcTime: queryPolicies.search.gcTime,
  });

  return useMemo(
    () => ({
      userAccounts: query.data?.items ?? [],
      userAccountsPage: query.data?.page ?? {
        page: filters.page,
        size: filters.size,
        totalItems: 0,
        totalPages: 0,
      },
      userAccountsLoading: query.isPending || query.isFetching,
      userAccountsError: query.error
        ? toUserFacingErrorMessage(
            query.error,
            "사용자 목록을 불러오지 못했습니다.",
          )
        : null,
      refetchUserAccounts: query.refetch,
    }),
    [
      filters.page,
      filters.size,
      query.data,
      query.error,
      query.isFetching,
      query.isPending,
      query.refetch,
    ],
  );
}
