import { useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import type { ProductFilters, ProductRecord } from "./types";

type UseProductsQueryOptions = {
  getDefaultFilters: () => ProductFilters;
};

export function useProductsQuery({ getDefaultFilters }: UseProductsQueryOptions) {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsQueryError, setProductsQueryError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, ProductRecord[]>());
  const inflightRef = useRef(new Map<string, Promise<ProductRecord[]>>());
  const productsVersion = useQueryInvalidationVersion("products");

  async function loadProducts(filters?: ProductFilters) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setProductsLoading(true);
    setProductsQueryError(null);

    try {
      const effectiveFilters = filters ?? getDefaultFilters();
      const params = new URLSearchParams();
      if (effectiveFilters.category) {
        params.set("category", effectiveFilters.category);
      }
      if (effectiveFilters.status) {
        params.set("status", effectiveFilters.status);
      }
      const query = params.toString();
      const cacheKey = `${productsVersion}:${query}`;
      if (cacheRef.current.has(cacheKey)) {
        if (requestIdRef.current !== requestId) return;
        setProducts(cacheRef.current.get(cacheKey) ?? []);
        return;
      }

      let responsePromise = inflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<ProductRecord[]>(`/api/v1/products${query ? `?${query}` : ""}`)
          .then((response) => response.data)
          .finally(() => inflightRef.current.delete(cacheKey));
        inflightRef.current.set(cacheKey, responsePromise);
      }

      const nextProducts = await responsePromise;
      if (requestIdRef.current !== requestId) return;
      cacheRef.current.set(cacheKey, nextProducts);
      setProducts(nextProducts);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setProducts([]);
      setProductsQueryError(error instanceof Error ? error.message : "상품 목록을 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setProductsLoading(false);
      }
    }
  }

  function resetProductsQuery() {
    requestIdRef.current += 1;
    setProducts([]);
    setProductsLoading(false);
    setProductsQueryError(null);
  }

  return {
    products,
    productsLoading,
    productsQueryError,
    loadProducts,
    resetProductsQuery
  } as const;
}
