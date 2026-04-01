import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Dashboard from "./Dashboard";
import { AuthStateProvider } from "../app/auth";
import { ThemeProvider } from "../app/theme";
import { setMockApiModeForTests } from "../api/client";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

describe("Dashboard", () => {
  it("renders the hero heading and quick links for desk users", async () => {
    setMockApiModeForTests(false);

    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthStateProvider
            value={{
              securityMode: "jwt",
              authBootstrapping: false,
              authUser: {
                userId: 21,
                username: "desk-user",
                primaryRole: "ROLE_DESK",
                roles: ["ROLE_DESK"]
              }
            }}
          >
            <Dashboard />
          </AuthStateProvider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "운영 대시보드" })).toBeTruthy();
    expect(screen.getByText("활성 모듈")).toBeTruthy();
    expect(await screen.findByText("트레이너 관리")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /업무 열기/ }).length).toBeGreaterThan(0);
  }, 10000);
});
