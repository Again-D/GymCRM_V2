import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";
import type { ProductFilters, ProductSummary } from "./useProductWorkspaceState";

type UseProductsQueryOptions = {
  getDefaultFilters: () => ProductFilters;
  formatError: (error: unknown) => string;
  enabled?: boolean;
  invalidationVersion?: number;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useProductsQuery({
  getDefaultFilters,
  formatError,
  enabled = true,
  invalidationVersion = 0
}: UseProductsQueryOptions) {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsQueryError, setProductsQueryError] = useState<string | null>(null);
  const getDefaultFiltersRef = useLatestRef(getDefaultFilters);
  const formatErrorRef = useLatestRef(formatError);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const lastFiltersRef = useRef<ProductFilters | undefined>(undefined);

  async function loadProducts(filters?: ProductFilters) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    hasLoadedRef.current = true;
    lastFiltersRef.current = filters;
    setProductsLoading(true);
    setProductsQueryError(null);
    try {
      const effectiveFilters = filters ?? getDefaultFiltersRef.current();
      const params = new URLSearchParams();
      if (effectiveFilters.category) {
        params.set("category", effectiveFilters.category);
      }
      if (effectiveFilters.status) {
        params.set("status", effectiveFilters.status);
      }
      const query = params.toString();
      const response = await apiGet<ProductSummary[]>(`/api/v1/products${query ? `?${query}` : ""}`);
      if (requestIdRef.current !== requestId) {
        return;
      }
      setProducts(response.data);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setProductsQueryError(formatErrorRef.current(error));
    } finally {
      if (requestIdRef.current === requestId) {
        setProductsLoading(false);
      }
    }
  }

  function resetProductsQuery() {
    requestIdRef.current += 1;
    hasLoadedRef.current = false;
    lastFiltersRef.current = undefined;
    setProducts([]);
    setProductsLoading(false);
    setProductsQueryError(null);
  }

  const loadProductsRef = useLatestRef(loadProducts);

  useEffect(() => {
    if (!enabled || !hasLoadedRef.current) {
      return;
    }
    void loadProductsRef.current(lastFiltersRef.current);
  }, [enabled, invalidationVersion]);

  return {
    products,
    setProducts,
    productsLoading,
    productsQueryError,
    loadProducts,
    resetProductsQuery
  } as const;
}
