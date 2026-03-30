import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import { SelectedMemberProvider } from "../members/modules/SelectedMemberContext";
import LockersPage from "./LockersPage";
import { FoundationProviders } from "../../app/providers";
import { selectedMemberStore } from "../../app/selectedMemberStore";

describe("LockersPage", () => {
  beforeEach(() => {
    selectedMemberStore.getState().reset();
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
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"]
          }
        }}
      >
        <SelectedMemberProvider>
          <LockersPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "라커 관리" })).toBeTruthy();
    expect(screen.getByText(/현재 관리자 권한이 없어 라커 배정 및 수정 작업을 실행할 수 없습니다/)).toBeTruthy();
    expect(screen.getByText(/라커 목록 불러오는 중...|조건에 맞는 라커가 없습니다./)).toBeTruthy();
  }, 10000);
});
