import { createStore, type StoreApi } from "zustand/vanilla";

import type { AuthState, PrototypeAuthUser, SecurityMode } from "./auth";

export type AuthStoreState = Readonly<AuthState & {
  isMockMode: boolean;
  authError: string | null;
  authStatusMessage: string | null;
  loginSubmitting: boolean;
}>;

type AuthRuntimeUpdater = (state: AuthState) => AuthState;

export type AuthStoreActions = {
  hydrate: (state: AuthStoreState) => void;
  setRuntimeState: (state: AuthState) => void;
  updateRuntimeState: (updater: AuthRuntimeUpdater) => void;
  setIsMockMode: (isMockMode: boolean) => void;
  setAuthError: (authError: string | null) => void;
  setAuthStatusMessage: (authStatusMessage: string | null) => void;
  setLoginSubmitting: (loginSubmitting: boolean) => void;
  setAuthUser: (securityMode: SecurityMode, authUser: PrototypeAuthUser | null) => void;
};

export type AuthStore = AuthStoreState & AuthStoreActions;
export type AuthStoreApi = StoreApi<AuthStore>;

export const initialAuthStoreState = {
  securityMode: "prototype",
  authBootstrapping: false,
  authUser: null,
  isMockMode: true,
  authError: null,
  authStatusMessage: null,
  loginSubmitting: false
} satisfies AuthStoreState;

export function createAuthStore(initialState: AuthStoreState): AuthStoreApi {
  return createStore<AuthStore>()((set) => ({
    ...initialState,
    hydrate: (state) => set(state),
    setRuntimeState: (state) => set(state),
    updateRuntimeState: (updater) =>
      set((current) =>
        updater({
          securityMode: current.securityMode,
          authBootstrapping: current.authBootstrapping,
          authUser: current.authUser
        })
      ),
    setIsMockMode: (isMockMode) => set({ isMockMode }),
    setAuthError: (authError) => set({ authError }),
    setAuthStatusMessage: (authStatusMessage) => set({ authStatusMessage }),
    setLoginSubmitting: (loginSubmitting) => set({ loginSubmitting }),
    setAuthUser: (securityMode, authUser) => set({ securityMode, authUser })
  }));
}
