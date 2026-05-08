import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { CrmTemplateFilters, CrmTemplateRow } from "./types";

type CrmTemplateResponse = {
  rows: CrmTemplateRow[];
};

export function useCrmTemplatesQuery(filters: CrmTemplateFilters) {
  const query = useQuery({
    queryKey: queryKeys.crm.list({
      channelType: filters.channelType,
      activeOnly: filters.activeOnly,
      limit: filters.limit,
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      const parsedLimit = Number.parseInt(filters.limit, 10);
      params.set("limit", Number.isFinite(parsedLimit) ? String(parsedLimit) : "50");
      if (filters.channelType) {
        params.set("channelType", filters.channelType);
      }
      if (filters.activeOnly) {
        params.set("activeOnly", "true");
      }
      const queryString = params.toString();
      const response = await apiGet<CrmTemplateResponse>(
        `/api/v1/crm/templates${queryString ? `?${queryString}` : ""}`,
      );
      return response.data.rows;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const { refetch } = query;

  return useMemo(() => ({
    crmTemplateRows: query.data ?? [],
    crmTemplateLoading: query.isFetching || query.isPending,
    crmTemplateError: query.error ? toUserFacingErrorMessage(query.error, "CRM 템플릿 목록을 불러오지 못했습니다.") : null,
    refetchCrmTemplates: refetch,
  }), [
    query.data,
    query.isFetching,
    query.isPending,
    query.error,
    refetch,
  ]);
}
