import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach as afterEachTest, describe, expect, it } from "vitest";

import App from "./App";
import { AuthStateProvider } from "./app/auth";
import { ThemeProvider } from "./app/theme";
import { setMockApiModeForTests } from "./api/client";

afterEachTest(() => {
  cleanup();
});

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
                role: "ROLE_DESK",
              },
            }}
          >
            <App />
          </AuthStateProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "트레이너 관리" })).toBeTruthy();
  });

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
                role: "ROLE_SUPER_ADMIN",
              },
            }}
          >
            <App />
          </AuthStateProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("link", { name: "트레이너 관리" })).toBeTruthy();
  });

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
                role: "ROLE_TRAINER",
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
  });
});
