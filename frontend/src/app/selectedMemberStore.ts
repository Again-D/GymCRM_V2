import { createStore, type StoreApi } from "zustand/vanilla";

export type SelectedMemberStoreState = Readonly<{
  selectedMemberId: number | null;
  isSelectionPending: boolean;
  selectionError: string | null;
}>;

export type SelectedMemberStoreActions = {
  setSelectedMemberId: (memberId: number | null) => void;
  setSelectionPending: (pending: boolean) => void;
  setSelectionError: (error: string | null) => void;
  reset: () => void;
};

export type SelectedMemberStore = SelectedMemberStoreState & SelectedMemberStoreActions;
export type SelectedMemberStoreApi = StoreApi<SelectedMemberStore>;

export const initialSelectedMemberStoreState: SelectedMemberStoreState = {
  selectedMemberId: null,
  isSelectionPending: false,
  selectionError: null,
};

export const selectedMemberStore = createStore<SelectedMemberStore>()((set) => ({
  ...initialSelectedMemberStoreState,
  setSelectedMemberId: (selectedMemberId) => set({ selectedMemberId }),
  setSelectionPending: (isSelectionPending) => set({ isSelectionPending }),
  setSelectionError: (selectionError) => set({ selectionError }),
  reset: () => set(initialSelectedMemberStoreState),
}));
