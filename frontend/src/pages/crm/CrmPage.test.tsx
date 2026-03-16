import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import CrmPage from "./CrmPage";

describe("CrmPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-crm"
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
        <CrmPage />
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "CRM 운영" })).toBeTruthy();
    expect(screen.getByText("현재 권한에서는 CRM 발송 작업을 실행할 수 없습니다.")).toBeTruthy();
    expect(screen.getByText("발송 이력이 없습니다.")).toBeTruthy();
  });

  it("does not trigger live crm requests from unsupported-role controls", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-crm"
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

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
        <CrmPage />
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "CRM 운영" })).toBeTruthy();

    const syncButton = screen.getByRole("button", { name: "로그 새로고침" });

    expect(syncButton).toHaveProperty("disabled", true);

    fireEvent.click(syncButton);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
