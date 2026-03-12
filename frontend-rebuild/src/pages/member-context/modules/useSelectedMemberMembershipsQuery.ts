import { useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import type { PurchasedMembership } from "../../members/modules/types";

type CreateMembershipInput = {
  memberId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
};

export function useSelectedMemberMembershipsQuery() {
  const [selectedMemberMemberships, setSelectedMemberMemberships] = useState<PurchasedMembership[]>([]);
  const [selectedMemberMembershipsLoading, setSelectedMemberMembershipsLoading] = useState(false);
  const [selectedMemberMembershipsError, setSelectedMemberMembershipsError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const membershipIdSeedRef = useRef(99000);

  async function loadSelectedMemberMemberships(memberId: number) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSelectedMemberMembershipsLoading(true);
    setSelectedMemberMembershipsError(null);

    try {
      const response = await apiGet<PurchasedMembership[]>(`/api/v1/members/${memberId}/memberships`);
      if (requestIdRef.current !== requestId) {
        return;
      }
      setSelectedMemberMemberships(response.data);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setSelectedMemberMemberships([]);
      setSelectedMemberMembershipsError(error instanceof Error ? error.message : "회원권 목록을 불러오지 못했습니다.");
    } finally {
      if (requestIdRef.current === requestId) {
        setSelectedMemberMembershipsLoading(false);
      }
    }
  }

  function resetSelectedMemberMembershipsQuery() {
    requestIdRef.current += 1;
    setSelectedMemberMemberships([]);
    setSelectedMemberMembershipsLoading(false);
    setSelectedMemberMembershipsError(null);
  }

  function createLocalMembership(input: CreateMembershipInput) {
    membershipIdSeedRef.current += 1;
    const membership: PurchasedMembership = {
      membershipId: membershipIdSeedRef.current,
      memberId: input.memberId,
      productNameSnapshot: input.productNameSnapshot,
      productTypeSnapshot: input.productTypeSnapshot,
      membershipStatus: "ACTIVE",
      startDate: input.startDate,
      endDate: input.endDate,
      remainingCount: input.remainingCount,
      activeHoldStatus: null
    };

    setSelectedMemberMemberships((prev) => [membership, ...prev]);
    return membership;
  }

  function patchLocalMembership(
    membershipId: number,
    updater: (membership: PurchasedMembership) => PurchasedMembership
  ) {
    setSelectedMemberMemberships((prev) =>
      prev.map((membership) => (membership.membershipId === membershipId ? updater(membership) : membership))
    );
  }

  return {
    selectedMemberMemberships,
    selectedMemberMembershipsLoading,
    selectedMemberMembershipsError,
    loadSelectedMemberMemberships,
    resetSelectedMemberMembershipsQuery,
    createLocalMembership,
    patchLocalMembership
  } as const;
}
