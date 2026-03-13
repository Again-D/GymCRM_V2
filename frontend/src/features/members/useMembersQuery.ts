import { useEffect, useRef, useState } from "react";
import { apiGet } from "../../shared/api/client";

export type MemberSummary = {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
  membershipOperationalStatus: "정상" | "홀딩중" | "만료임박" | "만료" | "없음";
  membershipExpiryDate: string | null;
  remainingPtCount: number | null;
};

export type MemberQueryFilters = {
  name: string;
  phone: string;
  trainerId: string;
  productId: string;
  membershipOperationalStatus: string;
  dateFrom: string;
  dateTo: string;
};

type UseMembersQueryOptions = {
  getDefaultFilters: () => MemberQueryFilters;
  formatError: (error: unknown) => string;
  enabled?: boolean;
  invalidationVersion?: number;
};

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useMembersQuery({
  getDefaultFilters,
  formatError,
  enabled = true,
  invalidationVersion = 0
}: UseMembersQueryOptions) {
  const [members, setMembers] = useState<MemberSummary[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersQueryError, setMembersQueryError] = useState<string | null>(
    null,
  );
  const getDefaultFiltersRef = useLatestRef(getDefaultFilters);
  const formatErrorRef = useLatestRef(formatError);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);
  const lastFiltersRef = useRef<Partial<MemberQueryFilters> | undefined>(undefined);

  async function loadMembers(filters?: Partial<MemberQueryFilters>) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    hasLoadedRef.current = true;
    lastFiltersRef.current = filters;
    setMembersLoading(true);
    setMembersQueryError(null);
    try {
      const defaults = getDefaultFiltersRef.current();
      const name = filters?.name ?? defaults.name;
      const phone = filters?.phone ?? defaults.phone;
      const trainerId = filters?.trainerId ?? defaults.trainerId;
      const productId = filters?.productId ?? defaults.productId;
      const membershipOperationalStatus =
        filters?.membershipOperationalStatus ?? defaults.membershipOperationalStatus;
      const dateFrom = filters?.dateFrom ?? defaults.dateFrom;
      const dateTo = filters?.dateTo ?? defaults.dateTo;
      const params = new URLSearchParams();
      if (name.trim()) {
        params.set("name", name.trim());
      }
      if (phone.trim()) {
        params.set("phone", phone.trim());
      }
      if (trainerId.trim()) {
        params.set("trainerId", trainerId.trim());
      }
      if (productId.trim()) {
        params.set("productId", productId.trim());
      }
      if (membershipOperationalStatus.trim()) {
        params.set(
          "membershipOperationalStatus",
          membershipOperationalStatus.trim(),
        );
      }
      if (dateFrom.trim()) {
        params.set("dateFrom", dateFrom.trim());
      }
      if (dateTo.trim()) {
        params.set("dateTo", dateTo.trim());
      }
      const query = params.toString();
      const response = await apiGet<MemberSummary[]>(
        `/api/v1/members${query ? `?${query}` : ""}`,
      );
      if (requestIdRef.current !== requestId) {
        return;
      }
      setMembers(response.data);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setMembersQueryError(formatErrorRef.current(error));
    } finally {
      if (requestIdRef.current === requestId) {
        setMembersLoading(false);
      }
    }
  }

  function resetMembersQuery() {
    requestIdRef.current += 1;
    hasLoadedRef.current = false;
    lastFiltersRef.current = undefined;
    setMembers([]);
    setMembersLoading(false);
    setMembersQueryError(null);
  }

  const loadMembersRef = useLatestRef(loadMembers);

  useEffect(() => {
    if (!enabled || !hasLoadedRef.current) {
      return;
    }
    void loadMembersRef.current(lastFiltersRef.current);
  }, [enabled, invalidationVersion]);

  return {
    members,
    setMembers,
    membersLoading,
    membersQueryError,
    loadMembers,
    resetMembersQuery,
  } as const;
}
