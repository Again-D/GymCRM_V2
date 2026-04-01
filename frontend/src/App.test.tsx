import { cleanup, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach as afterEachTest, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { AuthStateProvider } from "./app/auth";
import { ThemeProvider } from "./app/theme";
import { setMockApiModeForTests } from "./api/client";

afterEachTest(() => {
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

async function waitForShellLink(name: string) {
  const loadingHeading = screen.queryByRole("heading", { name: "Loading Workspace" });
  if (loadingHeading) {
    await waitForElementToBeRemoved(loadingHeading, { timeout: 20000 });
  }

  await waitFor(() => {
    expect(screen.queryByRole("link", { name })).toBeTruthy();
  }, { timeout: 20000 });
}

describe("App route guards", () => {
  it("shows trainer management navigation to desk users", async () => {
    setMockApiModeForTests(false);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ThemeProvider>
          <AuthStateProvider
            value={{
              securityMode: "jwt",
              authBootstrapping: false,
              authUser: {
                userId: 21,
                username: "desk-user",
                primaryRole: "ROLE_DESK",
                roles: ["ROLE_DESK"],
              },
            }}
          >
            <App />
          </AuthStateProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitForShellLink("트레이너 관리");
  }, 30000);

  it("shows trainer management navigation to super admin users", async () => {
    setMockApiModeForTests(false);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ThemeProvider>
          <AuthStateProvider
            value={{
              securityMode: "jwt",
              authBootstrapping: false,
              authUser: {
                userId: 1,
                username: "super-admin",
                primaryRole: "ROLE_SUPER_ADMIN",
                roles: ["ROLE_SUPER_ADMIN"],
              },
            }}
          >
            <App />
          </AuthStateProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitForShellLink("트레이너 관리");
  }, 20000);

  it("hides trainer management navigation from trainer users and redirects direct route access", async () => {
    setMockApiModeForTests(false);

    render(
      <MemoryRouter initialEntries={["/trainers"]}>
        <ThemeProvider>
          <AuthStateProvider
            value={{
              securityMode: "jwt",
              authBootstrapping: false,
              authUser: {
                userId: 41,
                username: "trainer-a",
                primaryRole: "ROLE_TRAINER",
                roles: ["ROLE_TRAINER"],
              },
            }}
          >
            <App />
          </AuthStateProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "운영 대시보드" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "트레이너 관리" })).toBeNull();
  }, 10000);

  it("shows my schedule navigation to trainer users", async () => {
    setMockApiModeForTests(false);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <ThemeProvider>
          <AuthStateProvider
            value={{
              securityMode: "jwt",
              authBootstrapping: false,
              authUser: {
                userId: 41,
                username: "trainer-a",
                primaryRole: "ROLE_TRAINER",
                roles: ["ROLE_TRAINER"],
              },
            }}
          >
            <App />
          </AuthStateProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    await waitForShellLink("내 스케줄");
    expect(screen.queryByRole("link", { name: "트레이너 관리" })).toBeNull();
  }, 20000);
});
