import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef
} from "react";
import { useStore } from "zustand";

import {
  createThemeStore,
  initialThemeStoreState,
  type ThemeStoreApi
} from "./themeStore";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const ThemeStoreContext = createContext<ThemeStoreApi | null>(null);

const STORAGE_KEY = "gymcrm.themePreference";
const LEGACY_STORAGE_KEY = "gymcrm-theme-preference";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function getBrowserStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage;
  if (
    !storage ||
    typeof storage.getItem !== "function" ||
    typeof storage.setItem !== "function" ||
    typeof storage.removeItem !== "function"
  ) {
    return null;
  }

  return storage;
}

function readStoredThemePreference() {
  const storage = getBrowserStorage();
  if (!storage) {
    return "system" as const;
  }

  const primaryValue = storage.getItem(STORAGE_KEY);
  if (isThemePreference(primaryValue)) {
    return primaryValue;
  }

  const legacyValue = storage.getItem(LEGACY_STORAGE_KEY);
  if (isThemePreference(legacyValue)) {
    return legacyValue;
  }

  return "system" as const;
}

function readSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

function applyResolvedTheme(nextTheme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", nextTheme);
}

function getInitialThemeState() {
  const themePreference = readStoredThemePreference();
  const systemTheme = readSystemTheme();

  return {
    ...initialThemeStoreState,
    themePreference,
    systemTheme,
    resolvedTheme: resolveTheme(themePreference, systemTheme)
  };
}

export function initializeThemeOnDocument() {
  const initialThemeState = getInitialThemeState();
  applyResolvedTheme(initialThemeState.resolvedTheme);
  return {
    themePreference: initialThemeState.themePreference,
    resolvedTheme: initialThemeState.resolvedTheme
  } as const;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<ThemeStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createThemeStore(getInitialThemeState());
  }

  const store = storeRef.current;
  const themePreference = useStore(store, (state) => state.themePreference);
  const resolvedTheme = useStore(store, (state) => state.resolvedTheme);

  useEffect(() => {
    const storage = getBrowserStorage();
    if (!storage) {
      applyResolvedTheme(resolvedTheme);
      return;
    }

    storage.setItem(STORAGE_KEY, themePreference);
    storage.removeItem(LEGACY_STORAGE_KEY);
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      store.getState().setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme);
    };
  }, [store]);

  return <ThemeStoreContext.Provider value={store}>{children}</ThemeStoreContext.Provider>;
}

export function useThemeStore() {
  const store = useContext(ThemeStoreContext);
  if (!store) {
    throw new Error("useThemeStore must be used inside ThemeProvider");
  }

  const themePreference = useStore(store, (state) => state.themePreference);
  const resolvedTheme = useStore(store, (state) => state.resolvedTheme);
  const setThemePreference = useStore(store, (state) => state.setThemePreference);

  return {
    themePreference,
    resolvedTheme,
    setThemePreference
  };
}
