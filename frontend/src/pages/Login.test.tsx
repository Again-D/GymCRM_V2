import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../api/client";
import { AuthStateProvider } from "../app/auth";
import Login from "./Login";

describe("Login", () => {
  beforeEach(() => {
    setMockApiModeForTests(false);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("starts live login inputs blank by default", () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: null,
          authBootstrapping: false
        }}
      >
        <Login />
      </AuthStateProvider>
    );

    expect(screen.getByLabelText("로그인 ID")).toHaveProperty("value", "");
    expect(screen.getByLabelText("비밀번호")).toHaveProperty("value", "");
  });

  it("shows admin-assisted recovery guidance in live mode", () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: null,
          authBootstrapping: false
        }}
      >
        <Login />
      </AuthStateProvider>
    );

    expect(screen.getByText("비밀번호를 잊으셨나요?")).toBeTruthy();
    expect(screen.getByText(/현재 센터 관리자에게 문의하세요/)).toBeTruthy();
  });

  it("shows the same recovery guidance in mock mode", () => {
    setMockApiModeForTests(true);

    render(
      <AuthStateProvider
        value={{
          securityMode: "prototype",
          authUser: null,
          authBootstrapping: false
        }}
      >
        <Login />
      </AuthStateProvider>
    );

    expect(screen.getByText("비밀번호를 잊으셨나요?")).toBeTruthy();
    expect(screen.getByText(/현재 센터 관리자에게 문의하세요/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /프로토타입 관리자 모드/ })).toBeTruthy();
  });
});
