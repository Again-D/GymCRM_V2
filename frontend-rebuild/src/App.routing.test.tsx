import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { AuthStateProvider, type AuthState } from "./app/auth";

function renderRoute(initialEntries: string[], authValue?: Partial<AuthState>) {
  render(
    <AuthStateProvider value={authValue}>
      <MemoryRouter initialEntries={initialEntries}>
        <App />
      </MemoryRouter>
    </AuthStateProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("prototype shell routing", () => {
  it("redirects root to dashboard in prototype mode", async () => {
    renderRoute(["/"]);

    expect(await screen.findByRole("heading", { name: "재구축 프로토타입 대시보드" })).toBeTruthy();
  });

  it("redirects protected shell routes to login in jwt unauthenticated mode", async () => {
    renderRoute(["/members"], {
      securityMode: "jwt",
      authUser: null
    });

    expect(await screen.findByRole("heading", { name: "로그인" })).toBeTruthy();
  });

  it("keeps the bootstrapping screen before redirects while auth state is loading", async () => {
    renderRoute(["/members"], {
      securityMode: "jwt",
      authBootstrapping: true,
      authUser: null
    });

    expect(await screen.findByRole("heading", { name: "부트스트래핑 중" })).toBeTruthy();
  });

  it("redirects unknown paths to dashboard for authenticated sessions", async () => {
    renderRoute(["/not-a-real-route"], {
      securityMode: "jwt"
    });

    expect(await screen.findByRole("heading", { name: "재구축 프로토타입 대시보드" })).toBeTruthy();
  });
});
