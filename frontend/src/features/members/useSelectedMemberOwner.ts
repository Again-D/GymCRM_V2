import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { apiGet } from "../../shared/api/client";
import type { AuthUserSession } from "../../shared/hooks/useAuthSession";

export type SelectedMemberDetail = {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate: string | null;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
  consentSms: boolean;
  consentMarketing: boolean;
  memo: string | null;
};

type UseSelectedMemberOwnerOptions = {
  authUser: AuthUserSession | null;
};

type SelectedMemberOwnerValue = ReturnType<typeof useSelectedMemberOwner>;

const SelectedMemberOwnerContext = createContext<SelectedMemberOwnerValue | null>(null);

export function useSelectedMemberOwner({ authUser }: UseSelectedMemberOwnerOptions) {
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<SelectedMemberDetail | null>(null);
  const [selectedMemberLoading, setSelectedMemberLoading] = useState(false);
  const requestIdRef = useRef(0);
  const authIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    const nextIdentity = authUser ? `${authUser.userId}:${authUser.roleCode}` : "anonymous";

    if (authIdentityRef.current == null) {
      authIdentityRef.current = nextIdentity;
      return;
    }

    if (authIdentityRef.current !== nextIdentity) {
      requestIdRef.current += 1;
      setSelectedMemberId(null);
      setSelectedMember(null);
      setSelectedMemberLoading(false);
    }

    authIdentityRef.current = nextIdentity;
  }, [authUser]);

  async function selectMember(memberId: number) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSelectedMemberId(memberId);
    setSelectedMemberLoading(true);

    try {
      const response = await apiGet<SelectedMemberDetail>(`/api/v1/members/${memberId}`);
      if (requestIdRef.current !== requestId) {
        return null;
      }
      setSelectedMember(response.data);
      return response.data;
    } finally {
      if (requestIdRef.current === requestId) {
        setSelectedMemberLoading(false);
      }
    }
  }

  function clearSelectedMember() {
    requestIdRef.current += 1;
    setSelectedMemberId(null);
    setSelectedMember(null);
    setSelectedMemberLoading(false);
  }

  function replaceSelectedMember(nextMember: SelectedMemberDetail | null) {
    requestIdRef.current += 1;
    setSelectedMemberId(nextMember?.memberId ?? null);
    setSelectedMember(nextMember);
    setSelectedMemberLoading(false);
  }

  return {
    selectedMemberId,
    selectedMember,
    selectedMemberLoading,
    selectMember,
    clearSelectedMember,
    replaceSelectedMember
  } as const;
}

export function SelectedMemberOwnerProvider({
  value,
  children
}: {
  value: SelectedMemberOwnerValue;
  children: ReactNode;
}) {
  return createElement(SelectedMemberOwnerContext.Provider, { value }, children);
}

export function useSelectedMemberContext() {
  const value = useContext(SelectedMemberOwnerContext);
  if (!value) {
    throw new Error("useSelectedMemberContext must be used within SelectedMemberOwnerProvider");
  }
  return value;
}
