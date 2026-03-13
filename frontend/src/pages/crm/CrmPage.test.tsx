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
        data: { rows: [] },
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

    expect(await screen.findByRole("heading", { name: "CRM 메시지 프로토타입" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "이 역할은 live CRM 미지원" })).toBeTruthy();
    expect(screen.getByText("현재 역할에서는 live CRM 이력을 조회할 수 없습니다.")).toBeTruthy();
  });

  it("does not trigger live crm requests from unsupported-role controls", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: { rows: [] },
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

    expect(await screen.findByRole("heading", { name: "이 역할은 live CRM 미지원" })).toBeTruthy();

    const submitButton = screen.getByRole("button", { name: "조회" });
    const resetButton = screen.getByRole("button", { name: "초기화" });

    expect(submitButton).toHaveProperty("disabled", true);
    expect(resetButton).toHaveProperty("disabled", true);

    fireEvent.click(submitButton);
    fireEvent.click(resetButton);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
