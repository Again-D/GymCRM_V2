import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import { SelectedMemberProvider } from "../members/modules/SelectedMemberContext";
import LockersPage from "./LockersPage";

describe("LockersPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-lockers"
      })
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows trainer unsupported note in live mode", async () => {
    setMockApiModeForTests(false);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "trainer-a",
            role: "ROLE_TRAINER"
          }
        }}
      >
        <SelectedMemberProvider>
          <LockersPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "라커 관리" })).toBeTruthy();
    expect(screen.getByText("현재 권한에서는 라커 작업을 수정할 수 없습니다.")).toBeTruthy();
    expect(screen.getByText(/라커 목록 불러오는 중...|조건에 맞는 라커가 없습니다./)).toBeTruthy();
  });
});
