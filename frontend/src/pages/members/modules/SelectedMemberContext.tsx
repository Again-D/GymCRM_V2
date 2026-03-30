import { QueryClientContext, QueryClientProvider } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext, useMemo } from "react";

import { appQueryClient } from "../../../app/queryClient";
import { useSelectedMemberActions, useSelectedMemberSessionManagement, useSelectedMemberStore as useSelectedMemberFoundationStore } from "../../../app/selectedMember";
import type { MemberDetail } from "./types";

type SelectedMemberValue = {
  selectedMemberId: number | null;
  selectedMember: MemberDetail | null;
  selectedMemberLoading: boolean;
  selectedMemberError: string | null;
  selectMember: (memberId: number) => Promise<boolean>;
  clearSelectedMember: () => void;
};

const SelectedMemberContext = createContext<SelectedMemberValue | null>(null);

export function SelectedMemberProvider({ children }: PropsWithChildren) {
  const queryClient = useContext(QueryClientContext);

  if (queryClient == null) {
    return (
      <QueryClientProvider client={appQueryClient}>
        <SelectedMemberProviderInner>{children}</SelectedMemberProviderInner>
      </QueryClientProvider>
    );
  }

  return <SelectedMemberProviderInner>{children}</SelectedMemberProviderInner>;
}

function SelectedMemberProviderInner({ children }: PropsWithChildren) {
  // Handle session-sensitive resets (logout, auth identity change, etc.)
  useSelectedMemberSessionManagement();

  const store = useSelectedMemberFoundationStore();
  const { selectMember, clearSelectedMember } = useSelectedMemberActions();

  const value = useMemo<SelectedMemberValue>(
    () => ({
      ...store,
      selectMember,
      clearSelectedMember
    }),
    [store, selectMember, clearSelectedMember]
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
