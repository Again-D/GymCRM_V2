import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { AuthStateProvider, type AuthState } from "./app/auth";
import { ThemeProvider } from "./app/theme";

function renderRoute(initialEntries: string[], authValue?: Partial<AuthState>) {
  render(
    <ThemeProvider>
      <AuthStateProvider value={{ authBootstrapping: false, ...authValue }}>
        <MemoryRouter initialEntries={initialEntries}>
          <App />
        </MemoryRouter>
      </AuthStateProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
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

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("prototype shell routing", () => {
  it("redirects root to dashboard in prototype mode", async () => {
    renderRoute(["/"], {
      securityMode: "prototype"
    });

    expect(await screen.findByRole("heading", { name: "운영 대시보드" })).toBeTruthy();
  });

  it("redirects protected shell routes to login in jwt unauthenticated mode", async () => {
    renderRoute(["/members"], {
      securityMode: "jwt",
      authUser: null
    });

    expect(await screen.findByRole("heading", { name: "GymCRM" })).toBeTruthy();
  });

  it("keeps the bootstrapping screen before redirects while auth state is loading", async () => {
    render(
      <ThemeProvider>
        <AuthStateProvider value={{ securityMode: "jwt", authBootstrapping: true, authUser: null }}>
          <MemoryRouter initialEntries={["/members"]}>
            <App />
          </MemoryRouter>
        </AuthStateProvider>
      </ThemeProvider>
    );

    expect(await screen.findByRole("heading", { name: "System Initializing" })).toBeTruthy();
  });

  it("redirects unknown paths to dashboard for authenticated sessions", async () => {
    renderRoute(["/not-a-real-route"], {
      securityMode: "jwt",
      authUser: { userId: 1, username: "test", primaryRole: "ADMIN", roles: ["ADMIN"] }
    });

    expect(await screen.findByRole("heading", { name: "운영 대시보드" })).toBeTruthy();
  });
});
