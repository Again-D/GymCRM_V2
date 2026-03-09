import { useEffect, useLayoutEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const THEME_PREFERENCE_STORAGE_KEY = "gymcrm.themePreference";

function normalizeThemePreference(value: string | null): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function detectSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function useThemePreference() {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => readThemePreference());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => detectSystemTheme());
  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (themePreference === "system" ? systemTheme : themePreference),
    [systemTheme, themePreference]
  );

  useLayoutEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      if (themePreference === "system") {
        window.localStorage.removeItem(THEME_PREFERENCE_STORAGE_KEY);
      } else {
        window.localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, themePreference);
      }
    } catch {
      // Ignore storage access failures and continue with in-memory theme.
    }
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light");
    };

    handleChange();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  return {
    themePreference,
    setThemePreference,
    resolvedTheme
  } as const;
}
