import { useCallback, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import { useQueryInvalidationVersion } from "../../../api/queryInvalidation";
import { useAuthState } from "../../../app/auth";
import { filterMemberIdsForAuth } from "../../member-context/modules/trainerScope";
import type { MemberQueryFilters, MemberSummary } from "./types";

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useMembersQuery({
  getDefaultFilters
}: {
  getDefaultFilters: () => MemberQueryFilters;
}) {
  const { authUser } = useAuthState();
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersQueryError, setMembersQueryError] = useState<string | null>(null);
  const getDefaultFiltersRef = useLatestRef(getDefaultFilters);
  const requestIdRef = useRef(0);
  const cacheRef = useRef(new Map<string, MemberSummary[]>());
  const inflightRef = useRef(new Map<string, Promise<MemberSummary[]>>());
  const membersVersion = useQueryInvalidationVersion("members");

  const loadMembers = useCallback(async (filters?: Partial<MemberQueryFilters>) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setMembersLoading(true);
    setMembersQueryError(null);

    try {
      const defaults = getDefaultFiltersRef.current();
      const name = filters?.name ?? defaults.name;
      const phone = filters?.phone ?? defaults.phone;
      const membershipOperationalStatus = filters?.membershipOperationalStatus ?? defaults.membershipOperationalStatus;
      const dateFrom = filters?.dateFrom ?? defaults.dateFrom;
      const dateTo = filters?.dateTo ?? defaults.dateTo;
      const params = new URLSearchParams();
      if (name.trim()) params.set("name", name.trim());
      if (phone.trim()) params.set("phone", phone.trim());
      if (membershipOperationalStatus.trim()) params.set("membershipOperationalStatus", membershipOperationalStatus.trim());
      if (dateFrom.trim()) params.set("dateFrom", dateFrom.trim());
      if (dateTo.trim()) params.set("dateTo", dateTo.trim());
      const query = params.toString();
      const cacheKey = `${authUser?.role ?? "anon"}:${authUser?.userId ?? "none"}:${membersVersion}:${query}`;
      if (cacheRef.current.has(cacheKey)) {
        if (requestIdRef.current !== requestId) return;
        setMembers(cacheRef.current.get(cacheKey) ?? []);
        return;
      }

      let responsePromise = inflightRef.current.get(cacheKey);
      if (!responsePromise) {
        responsePromise = apiGet<MemberSummary[]>(`/api/v1/members${query ? `?${query}` : ""}`)
          .then((response) => filterMemberIdsForAuth(response.data, authUser))
          .finally(() => {
            inflightRef.current.delete(cacheKey);
          });
        inflightRef.current.set(cacheKey, responsePromise);
      }

      const scopedMembers = await responsePromise;
      if (requestIdRef.current !== requestId) return;
      cacheRef.current.set(cacheKey, scopedMembers);
      setMembers(scopedMembers);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setMembersQueryError(error instanceof Error ? error.message : "회원 목록을 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setMembersLoading(false);
      }
    }
  }, [authUser, membersVersion, getDefaultFiltersRef]);

  const resetMembersQuery = useCallback(() => {
    requestIdRef.current += 1;
    setMembers((prev) => (prev.length === 0 ? prev : []));
    setMembersLoading(false);
    setMembersQueryError(null);
  }, []);

  return {
    members,
    membersLoading,
    membersQueryError,
    loadMembers,
    resetMembersQuery,
    setMembers
  } as const;
}
