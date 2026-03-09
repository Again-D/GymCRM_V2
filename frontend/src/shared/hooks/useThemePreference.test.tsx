import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useThemePreference } from "./useThemePreference";

describe("useThemePreference", () => {
  const originalMatchMedia = window.matchMedia;
  const originalLocalStorage = window.localStorage;

  beforeEach(() => {
    document.documentElement.dataset.theme = "";
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage
    });
    vi.restoreAllMocks();
  });

  it("applies persisted theme to the document dataset on initial render", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn().mockReturnValue("dark"),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })) as typeof window.matchMedia;

    const { result } = renderHook(() => useThemePreference());

    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("falls back to system theme when localStorage access throws", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(() => {
          throw new DOMException("blocked", "SecurityError");
        }),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }
    });

    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })) as typeof window.matchMedia;

    const { result } = renderHook(() => useThemePreference());

    expect(result.current.themePreference).toBe("system");
    expect(result.current.resolvedTheme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
