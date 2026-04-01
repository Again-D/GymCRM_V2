import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../api/client";
import { queryKeys, queryPolicies } from "../../../app/queryHelpers";
import { toUserFacingErrorMessage } from "../../../app/uiError";
import type { ProductFilters, ProductRecord } from "./types";

export function useProductsQuery(filters: ProductFilters) {
  const query = useQuery({
    queryKey: queryKeys.products.list({ 
      category: filters.category, 
      status: filters.status 
    }),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.category) {
        params.set("category", filters.category);
      }
      if (filters.status) {
        params.set("status", filters.status);
      }
      const queryString = params.toString();
      const response = await apiGet<ProductRecord[]>(
        `/api/v1/products${queryString ? `?${queryString}` : ""}`,
      );
      return response.data;
    },
    staleTime: queryPolicies.list.staleTime,
    gcTime: queryPolicies.list.gcTime,
  });

  const { refetch } = query;

  return useMemo(() => ({
    products: query.data ?? [],
    productsLoading: query.isFetching || query.isPending,
    productsQueryError: query.error ? toUserFacingErrorMessage(query.error, "상품 목록을 불러오지 못했습니다.") : null,
    refetchProducts: refetch,
  }), [
    query.data,
    query.isFetching,
    query.isPending,
    query.error,
    refetch
  ]);
}
