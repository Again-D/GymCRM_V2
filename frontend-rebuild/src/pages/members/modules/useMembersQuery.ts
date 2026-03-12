import { useRef, useState } from "react";

import { apiGet } from "../../../api/client";
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

  async function loadMembers(filters?: Partial<MemberQueryFilters>) {
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
      const response = await apiGet<MemberSummary[]>(`/api/v1/members${query ? `?${query}` : ""}`);
      if (requestIdRef.current !== requestId) return;
      const scopedMembers = await filterMemberIdsForAuth(response.data, authUser);
      if (requestIdRef.current !== requestId) return;
      setMembers(scopedMembers);
    } catch (error) {
      if (requestIdRef.current !== requestId) return;
      setMembersQueryError(error instanceof Error ? error.message : "회원 목록을 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setMembersLoading(false);
      }
    }
  }

  return {
    members,
    membersLoading,
    membersQueryError,
    loadMembers,
    setMembers
  } as const;
}
