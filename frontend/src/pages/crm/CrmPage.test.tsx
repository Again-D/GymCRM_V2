import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../api/client";
import { FoundationProviders } from "../../app/providers";
import { appQueryClient } from "../../app/queryClient";
import CrmPage from "./CrmPage";

describe("CrmPage", () => {
  beforeEach(() => {
    appQueryClient.clear();
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
        <CrmPage />
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "CRM 운영" })).toBeTruthy();
    expect(screen.getByText("현재 관리자 권한이 없어 CRM 발송 작업을 실행할 수 없습니다.")).toBeTruthy();
    expect(screen.getByText("로그를 불러오는 중...")).toBeTruthy();
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
        <CrmPage />
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "CRM 운영" })).toBeTruthy();

    const syncButton = screen.getByRole("button", { name: /로그 새로고침$/ });
    const baselineCallCount = fetchMock.mock.calls.length;

    expect(syncButton).toHaveProperty("disabled", true);

    fireEvent.click(syncButton);

    expect(fetchMock).toHaveBeenCalledTimes(baselineCallCount);
  });
});
