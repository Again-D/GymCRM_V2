import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, waitForElementToBeRemoved } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { AuthStateProvider, type AuthState } from "./app/auth";
import { ThemeProvider } from "./app/theme";
import { setMockApiModeForTests } from "./api/client";

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

async function waitForShellHeading(name: string) {
  const loadingHeading = screen.queryByRole("heading", { name: "Loading Workspace" });
  if (loadingHeading) {
    await waitForElementToBeRemoved(loadingHeading, { timeout: 20000 });
  }

  await waitFor(() => {
    expect(screen.queryByRole("heading", { name })).toBeTruthy();
  }, { timeout: 20000 });
}

async function waitForStandaloneHeading(name: string) {
  const loadingHeading = screen.queryByRole("heading", { name: "Loading Workspace" });
  if (loadingHeading) {
    await waitForElementToBeRemoved(loadingHeading, { timeout: 20000 });
  }

  await waitFor(() => {
    expect(screen.queryByRole("heading", { name })).toBeTruthy();
  }, { timeout: 20000 });
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
  setMockApiModeForTests(null);
  vi.unstubAllGlobals();
});

describe("prototype shell routing", () => {
  it("redirects root to dashboard in prototype mode", async () => {
    renderRoute(["/"], {
      securityMode: "prototype"
    });

    await waitForShellHeading("운영 대시보드");
  }, 30000);

  it("redirects protected shell routes to login in jwt unauthenticated mode", async () => {
    renderRoute(["/members"], {
      securityMode: "jwt",
      authUser: null
    });

    expect(await screen.findByRole("heading", { name: "GymCRM" })).toBeTruthy();
  }, 10000);

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
  }, 10000);

  it("redirects unknown paths to dashboard for authenticated sessions", async () => {
    renderRoute(["/not-a-real-route"], {
      securityMode: "jwt",
      authUser: { userId: 1, username: "test", primaryRole: "ROLE_ADMIN", roles: ["ROLE_ADMIN"] }
    });

    await waitForShellHeading("운영 대시보드");
  }, 30000);

  it("redirects forced-change sessions to my account from dashboard and login", async () => {
    renderRoute(["/dashboard"], {
      securityMode: "jwt",
      authUser: {
        userId: 11,
        username: "forced-admin",
        primaryRole: "ROLE_ADMIN",
        roles: ["ROLE_ADMIN"],
        passwordChangeRequired: true
      }
    });

    await waitForStandaloneHeading("내 계정");

    cleanup();

    renderRoute(["/login"], {
      securityMode: "jwt",
      authUser: {
        userId: 11,
        username: "forced-admin",
        primaryRole: "ROLE_ADMIN",
        roles: ["ROLE_ADMIN"],
        passwordChangeRequired: true
      }
    });

    await waitForStandaloneHeading("내 계정");
  }, 30000);

  it("routes unauthenticated my-account visits to login", async () => {
    renderRoute(["/my-account"], {
      securityMode: "jwt",
      authUser: null
    });

    expect(await screen.findByRole("heading", { name: "GymCRM" })).toBeTruthy();
  }, 30000);

  it("allows the public member QR route without shell authentication", async () => {
    setMockApiModeForTests(false);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          memberId: 101,
          memberName: "홍길동",
          qrToken: "qr-token-1",
          issuedAt: "2026-05-08T10:00:00Z",
          expiresAt: "2026-05-08T10:00:01Z",
          ttlSeconds: 1,
          bootstrapExpiresAt: "2026-05-08T23:59:59Z"
        },
        message: "회원 QR 세션이 갱신되었습니다.",
        timestamp: "2026-05-08T10:00:00Z",
        traceId: "trace-member-qr"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    renderRoute(["/member-qr?token=bootstrap-token"], {
      securityMode: "jwt",
      authUser: null
    });

    expect(await screen.findByRole("heading", { name: "홍길동님의 출입 QR" })).toBeTruthy();
  }, 10000);
});
