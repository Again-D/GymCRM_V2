import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ThemeProvider,
  initializeThemeOnDocument,
  useThemeStore
} from "./theme";

function installLocalStorage() {
  const storage = new Map<string, string>();

  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
    clear: vi.fn(() => {
      storage.clear();
    })
  });
}

function ThemeProbe() {
  const { themePreference, resolvedTheme, setThemePreference } = useThemeStore();

  return (
    <div>
      <span>{`${themePreference}:${resolvedTheme}`}</span>
      <button type="button" onClick={() => setThemePreference("dark")}>
        dark
      </button>
    </div>
  );
}

function installMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  );
}

describe("theme lifecycle", () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("restores the documented storage key on first initialization", () => {
    installMatchMedia(true);
    localStorage.setItem("gymcrm.themePreference", "system");

    const result = initializeThemeOnDocument();

    expect(result.themePreference).toBe("system");
    expect(result.resolvedTheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("migrates the legacy storage key when the canonical key is absent", () => {
    installMatchMedia(false);
    localStorage.setItem("gymcrm-theme-preference", "dark");

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    expect(screen.getByText("dark:dark")).toBeTruthy();
    expect(localStorage.getItem("gymcrm.themePreference")).toBe("dark");
    expect(localStorage.getItem("gymcrm-theme-preference")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("persists preference changes and updates the document theme", () => {
    installMatchMedia(false);

    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(screen.getByText("dark:dark")).toBeTruthy();
    expect(localStorage.getItem("gymcrm.themePreference")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
