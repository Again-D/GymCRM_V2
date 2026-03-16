import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeStore = {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeStore | null>(null);

const STORAGE_KEY = "gymcrm.themePreference";
const LEGACY_STORAGE_KEY = "gymcrm-theme-preference";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredThemePreference() {
  if (typeof window === "undefined") {
    return "system" as const;
  }

  const primaryValue = window.localStorage.getItem(STORAGE_KEY);
  if (isThemePreference(primaryValue)) {
    return primaryValue;
  }

  const legacyValue = window.localStorage.getItem(LEGACY_STORAGE_KEY);
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

export function initializeThemeOnDocument() {
  const themePreference = readStoredThemePreference();
  const resolvedTheme = resolveTheme(themePreference, readSystemTheme());
  applyResolvedTheme(resolvedTheme);
  return { themePreference, resolvedTheme } as const;
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => readStoredThemePreference());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => readSystemTheme());

  const resolvedTheme = useMemo(
    () => resolveTheme(themePreference, systemTheme),
    [systemTheme, themePreference]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, themePreference);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    applyResolvedTheme(resolvedTheme);
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  const value = useMemo<ThemeStore>(
    () => ({ themePreference, resolvedTheme, setThemePreference }),
    [resolvedTheme, themePreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeStore() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeStore must be used inside ThemeProvider");
  }
  return context;
}
