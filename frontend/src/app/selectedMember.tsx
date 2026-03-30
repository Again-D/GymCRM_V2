import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";

import { apiGet } from "../api/client";
import { queryKeys, queryPolicies } from "./queryHelpers";
import { canAuthUserAccessMember } from "../pages/member-context/modules/trainerScope";
import type { MemberDetail } from "../pages/members/modules/types";
import { useAuthState } from "./auth";
import { createAuthIdentityKey } from "./roles";
import { selectedMemberStore } from "./selectedMemberStore";

export function useSelectedMemberStore() {
  const selectedMemberId = useStore(selectedMemberStore, (s) => s.selectedMemberId);
  const isSelectionPending = useStore(selectedMemberStore, (s) => s.isSelectionPending);
  const selectionError = useStore(selectedMemberStore, (s) => s.selectionError);

  const { authUser } = useAuthState();

  const {
    data: selectedMember = null,
    isLoading: isQueryLoading,
    error: queryError
  } = useQuery({
    queryKey: queryKeys.members.detail(selectedMemberId!),
    queryFn: async () => {
      if (selectedMemberId === null) return null;
      const response = await apiGet<MemberDetail>(`/api/v1/members/${selectedMemberId}`);
      return response.data;
    },
    enabled: selectedMemberId !== null,
    staleTime: queryPolicies.detail.staleTime,
  });

  return {
    selectedMemberId,
    selectedMember,
    selectedMemberLoading: isSelectionPending || isQueryLoading,
    selectedMemberError: selectionError || (queryError instanceof Error ? queryError.message : null),
  };
}

export function useSelectedMemberActions() {
  const { authUser } = useAuthState();
  const setSelectedMemberId = useStore(selectedMemberStore, (s) => s.setSelectedMemberId);
  const setSelectionPending = useStore(selectedMemberStore, (s) => s.setSelectionPending);
  const setSelectionError = useStore(selectedMemberStore, (s) => s.setSelectionError);
  const reset = useStore(selectedMemberStore, (s) => s.reset);

  const selectMember = useCallback(async (memberId: number) => {
    setSelectionPending(true);
    setSelectionError(null);

    try {
      const canAccess = await canAuthUserAccessMember(memberId, authUser);
      if (!canAccess) {
        setSelectedMemberId(null);
        setSelectionError("선택한 회원을 불러올 수 없어 회원 선택 화면을 유지합니다.");
        return false;
      }
      setSelectedMemberId(memberId);
      return true;
    } catch (error) {
      setSelectedMemberId(null);
      setSelectionError(error instanceof Error ? error.message : "회원 선택 중 오류가 발생했습니다.");
      return false;
    } finally {
      setSelectionPending(false);
    }
  }, [authUser, setSelectedMemberId, setSelectionError, setSelectionPending]);

  const clearSelectedMember = useCallback(() => {
    reset();
  }, [reset]);

  return {
    selectMember,
    clearSelectedMember
  };
}

/**
 * Hook to handle session-sensitive resets of the selected member.
 * This should be used once in a root layout or provider.
 */
export function useSelectedMemberSessionManagement() {
  const { authUser } = useAuthState();
  const reset = useStore(selectedMemberStore, (s) => s.reset);
  const authIdentityKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const nextAuthIdentityKey = createAuthIdentityKey(authUser);
    if (authIdentityKeyRef.current === null) {
      authIdentityKeyRef.current = nextAuthIdentityKey;
      return;
    }

    if (authIdentityKeyRef.current === nextAuthIdentityKey) {
      return;
    }

    authIdentityKeyRef.current = nextAuthIdentityKey;
    reset();
  }, [authUser, reset]);
}
