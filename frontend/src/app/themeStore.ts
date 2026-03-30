import { createStore, type StoreApi } from "zustand/vanilla";

import type { ResolvedTheme, ThemePreference } from "./theme";

export type ThemeStoreState = Readonly<{
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
}>;

export type ThemeStoreActions = {
  hydrate: (state: ThemeStoreState) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  setSystemTheme: (systemTheme: ResolvedTheme) => void;
};

export type ThemeStore = ThemeStoreState & ThemeStoreActions;
export type ThemeStoreApi = StoreApi<ThemeStore>;

export const initialThemeStoreState = {
  themePreference: "system",
  resolvedTheme: "light",
  systemTheme: "light"
} satisfies ThemeStoreState;

export function createThemeStore(initialState: ThemeStoreState): ThemeStoreApi {
  return createStore<ThemeStore>()((set) => ({
    ...initialState,
    hydrate: (state) => set(state),
    setThemePreference: (themePreference) =>
      set((current) => ({
        themePreference,
        resolvedTheme: themePreference === "system" ? current.systemTheme : themePreference
      })),
    setSystemTheme: (systemTheme) =>
      set((current) => ({
        systemTheme,
        resolvedTheme: current.themePreference === "system" ? systemTheme : current.themePreference
      }))
  }));
}
