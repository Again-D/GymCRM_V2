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
});
