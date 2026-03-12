import { createContext, type PropsWithChildren, useContext, useMemo, useRef, useState } from "react";

import { apiGet } from "../../../api/client";
import type { MemberDetail } from "./types";

type SelectedMemberStore = {
  selectedMemberId: number | null;
  selectedMember: MemberDetail | null;
  selectedMemberLoading: boolean;
  selectedMemberError: string | null;
  selectMember: (memberId: number) => Promise<boolean>;
  clearSelectedMember: () => void;
};

const SelectedMemberContext = createContext<SelectedMemberStore | null>(null);

export function SelectedMemberProvider({ children }: PropsWithChildren) {
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [selectedMemberLoading, setSelectedMemberLoading] = useState(false);
  const [selectedMemberError, setSelectedMemberError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  async function selectMember(memberId: number) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSelectedMemberLoading(true);
    setSelectedMemberError(null);

    try {
      const response = await apiGet<MemberDetail>(`/api/v1/members/${memberId}`);
      if (requestIdRef.current !== requestId) {
        return false;
      }
      setSelectedMemberId(response.data.memberId);
      setSelectedMember(response.data);
      return true;
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return false;
      }
      setSelectedMemberId(null);
      setSelectedMember(null);
      setSelectedMemberError(error instanceof Error ? error.message : "회원을 불러오지 못했습니다.");
      return false;
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
    setSelectedMemberError(null);
  }

  const value = useMemo<SelectedMemberStore>(
    () => ({
      selectedMemberId,
      selectedMember,
      selectedMemberLoading,
      selectedMemberError,
      selectMember,
      clearSelectedMember
    }),
    [selectedMemberId, selectedMember, selectedMemberLoading, selectedMemberError]
  );

  return <SelectedMemberContext.Provider value={value}>{children}</SelectedMemberContext.Provider>;
}

export function useSelectedMemberStore() {
  const value = useContext(SelectedMemberContext);
  if (!value) {
    throw new Error("useSelectedMemberStore must be used inside SelectedMemberProvider");
  }
  return value;
}
