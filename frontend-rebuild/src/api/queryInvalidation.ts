import { useSyncExternalStore } from "react";

export type QueryDomain =
  | "members"
  | "reservationTargets"
  | "accessPresence"
  | "accessEvents";

const versions = new Map<QueryDomain, number>();
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function getQueryInvalidationVersion(domain: QueryDomain) {
  return versions.get(domain) ?? 0;
}

export function invalidateQueryDomains(domains: QueryDomain[]) {
  let changed = false;
  for (const domain of domains) {
    versions.set(domain, getQueryInvalidationVersion(domain) + 1);
    changed = true;
  }
  if (changed) {
    emitChange();
  }
}

export function useQueryInvalidationVersion(domain: QueryDomain) {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getQueryInvalidationVersion(domain),
    () => getQueryInvalidationVersion(domain)
  );
}

export function resetQueryInvalidationStateForTests() {
  versions.clear();
  emitChange();
}
