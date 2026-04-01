import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  const createQueryClient = () => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it("renders the hero heading and role-based widgets for desk users", async () => {
    setMockApiModeForTests(true);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    );

    expect(screen.getByRole("heading", { name: "운영 대시보드" })).toBeTruthy();
    
    // Check for widgets that should be visible for ROLE_DESK
    expect(await screen.findByText("실시간 출입 현황")).toBeTruthy();
    expect(await screen.findByText("오늘의 수업 일정")).toBeTruthy();
    expect(await screen.findByText("CRM 대상자")).toBeTruthy();
    
    // Check for quick links section
    expect(screen.getByText("빠른 진입 경로")).toBeTruthy();
  }, 10000);
});
