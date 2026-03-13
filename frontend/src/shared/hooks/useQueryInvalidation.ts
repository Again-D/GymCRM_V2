import { useState } from "react";

export const QUERY_INVALIDATION_DOMAINS = [
  "members",
  "products",
  "reservationTargets",
  "reservationSchedules",
  "workspaceMemberSearch"
] as const;

export type QueryInvalidationDomain = (typeof QUERY_INVALIDATION_DOMAINS)[number];
export type QueryInvalidationVersions = Record<QueryInvalidationDomain, number>;

function createInitialVersions(): QueryInvalidationVersions {
  return {
    members: 0,
    products: 0,
    reservationTargets: 0,
    reservationSchedules: 0,
    workspaceMemberSearch: 0
  };
}

export function useQueryInvalidation() {
  const [versions, setVersions] = useState<QueryInvalidationVersions>(createInitialVersions);

  function invalidateQueries(...domains: QueryInvalidationDomain[]) {
    if (domains.length === 0) {
      return;
    }
    setVersions((current) => {
      const next = { ...current };
      for (const domain of domains) {
        next[domain] += 1;
      }
      return next;
    });
  }

  function resetQueryInvalidation() {
    setVersions(createInitialVersions());
  }

  return {
    queryInvalidationVersions: versions,
    invalidateQueries,
    resetQueryInvalidation
  } as const;
}
