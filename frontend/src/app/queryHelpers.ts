export function createQueryKeys<T extends string>(domain: T) {
  return {
    all: [domain] as const,
    lists: () => [domain, "list"] as const,
    list: (filters: Record<string, unknown>) => [domain, "list", filters] as const,
    details: () => [domain, "detail"] as const,
    detail: (id: string | number) => [domain, "detail", String(id)] as const,
  };
}

export const queryPolicies = {
  // Frequently changing lists, search results
  list: {
    staleTime: 1000 * 30, // 30 seconds
  },
  // Specific entity details, moderately stable
  detail: {
    staleTime: 1000 * 60 * 5, // 5 minutes
  },
  // Interactive search with dedupe requirements
  search: {
    staleTime: 1000 * 10, // 10 seconds
    gcTime: 1000 * 60, // 1 minute
  },
  // Immutable or rarely changing static reference data
  reference: {
    staleTime: Infinity,
    gcTime: Infinity,
  },
};

export const queryKeys = {
  members: createQueryKeys("members"),
  memberships: createQueryKeys("memberships"),
  reservations: createQueryKeys("reservations"),
  products: createQueryKeys("products"),
  trainers: createQueryKeys("trainers"),
  access: createQueryKeys("access"),
};
