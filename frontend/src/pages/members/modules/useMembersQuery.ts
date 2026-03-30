import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { useAuthState } from "../../../app/auth";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import { filterMemberIdsForAuth } from "../../member-context/modules/trainerScope";
import type { MemberQueryFilters, MemberSummary } from "./types";

export function useMembersQuery({
  getDefaultFilters,
}: {
  getDefaultFilters: () => MemberQueryFilters;
}) {
  const { authUser } = useAuthState();
  const [activeFilters, setActiveFilters] = useState<MemberQueryFilters | null>(null);

  const currentFilters = activeFilters ?? getDefaultFilters();

  const query = useQuery({
    queryKey: queryKeys.members.list(currentFilters as Record<string, unknown>),
    queryFn: async () => {
      const { name, phone, memberStatus, membershipOperationalStatus, dateFrom, dateTo } = currentFilters;
      const params = new URLSearchParams();
      if (name?.trim()) params.set("name", name.trim());
      if (phone?.trim()) params.set("phone", phone.trim());
      if (memberStatus?.trim()) params.set("memberStatus", memberStatus.trim());
      if (membershipOperationalStatus?.trim())
        params.set("membershipOperationalStatus", membershipOperationalStatus.trim());
      if (dateFrom?.trim()) params.set("dateFrom", dateFrom.trim());
      if (dateTo?.trim()) params.set("dateTo", dateTo.trim());
      
      const qString = params.toString();
      const response = await apiGet<MemberSummary[]>(`/api/v1/members${qString ? `?${qString}` : ""}`);
      return filterMemberIdsForAuth(response.data, authUser);
    },
    staleTime: queryPolicies.list.staleTime,
  });

  const loadMembers = useCallback(
    async (overrideFilters?: Partial<MemberQueryFilters>) => {
      setActiveFilters({ ...getDefaultFilters(), ...overrideFilters });
    },
    [getDefaultFilters]
  );

  const resetMembersQuery = useCallback(() => {
    setActiveFilters(null);
  }, []);

  return {
    members: query.data ?? [],
    membersLoading: query.isPending || query.isFetching,
    membersQueryError: query.error ? toUserFacingErrorMessage(query.error, "회원 목록을 불러오지 못했습니다.") : null,
    loadMembers,
    resetMembersQuery,
  } as const;
}
