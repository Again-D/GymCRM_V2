import { createStore, type StoreApi } from "zustand/vanilla";

type FeedbackSurface = "message" | "notification";
type FeedbackKind = "success" | "info" | "warning" | "error";

export type UiFeedbackEvent = Readonly<{
  surface: FeedbackSurface;
  kind: FeedbackKind;
  content: string;
  timestamp: number;
}>;

export type UiFeedbackStoreState = Readonly<{
  eventCount: number;
  lastEvent: UiFeedbackEvent | null;
}>;

export type UiFeedbackStoreActions = {
  recordEvent: (event: UiFeedbackEvent) => void;
  clearLastEvent: () => void;
};

export type UiFeedbackStore = UiFeedbackStoreState & UiFeedbackStoreActions;
export type UiFeedbackStoreApi = StoreApi<UiFeedbackStore>;

export const initialUiFeedbackStoreState = {
  eventCount: 0,
  lastEvent: null
} satisfies UiFeedbackStoreState;

export const uiFeedbackStore = createStore<UiFeedbackStore>()((set) => ({
  ...initialUiFeedbackStoreState,
  recordEvent: (event) =>
    set((current) => ({
      eventCount: current.eventCount + 1,
      lastEvent: event
    })),
  clearLastEvent: () => set({ lastEvent: null })
}));
