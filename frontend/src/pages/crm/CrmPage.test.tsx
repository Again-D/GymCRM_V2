import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../api/client";
import { FoundationProviders } from "../../app/providers";
import { appQueryClient } from "../../app/queryClient";
import CrmPage from "./CrmPage";

describe("CrmPage", () => {
  beforeEach(() => {
    appQueryClient.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function installMockFetch(
    templateRows: Array<Record<string, unknown>> = [],
    historyRows: Array<Record<string, unknown>> = [],
  ) {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const path = typeof input === "string" ? input : input.toString();
      const payload = path.includes("/api/v1/crm/templates")
        ? { rows: templateRows }
        : { rows: historyRows };

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: payload,
          message: "ok",
          timestamp: "2026-03-13T00:00:00Z",
          traceId: "trace-crm",
        }),
      } as Response;
    }));
  }

  it("shows trainer unsupported note in live mode", async () => {
    setMockApiModeForTests(false);
    installMockFetch();

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
    installMockFetch();
    const fetchMock = vi.mocked(globalThis.fetch);

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

  it("renders template governance state and filters inactive templates", async () => {
    setMockApiModeForTests(false);
    installMockFetch(
      [
        {
          templateId: 501,
          templateCode: "BIRTHDAY_OFFER",
          templateName: "생일 혜택",
          channelType: "SMS",
          templateType: "MARKETING",
          templateBody: "생일 축하 메시지",
          reviewStatus: "APPROVED",
          operationalStatus: "SENDABLE",
          sendable: true,
          isActive: true,
          createdAt: "2026-03-13T00:00:00Z",
          updatedAt: "2026-03-13T00:00:00Z",
        },
        {
          templateId: 502,
          templateCode: "INACTIVE_GUIDE",
          templateName: "보관 템플릿",
          channelType: "KAKAO",
          templateType: "TRANSACTIONAL",
          templateBody: "보관용 메시지",
          reviewStatus: "REJECTED",
          operationalStatus: "GOVERNANCE_ONLY",
          sendable: false,
          isActive: false,
          createdAt: "2026-03-12T00:00:00Z",
          updatedAt: "2026-03-12T00:00:00Z",
        },
      ],
      [],
    );

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 1,
            username: "admin",
            primaryRole: "ROLE_ADMIN",
            roles: ["ROLE_ADMIN"],
          },
        }}
      >
        <CrmPage />
      </FoundationProviders>
    );

    expect(await screen.findByText("템플릿 거버넌스")).toBeTruthy();
    expect(await screen.findByText("심사 승인")).toBeTruthy();
    expect(await screen.findByText("심사 반려")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "전체 보기" }));

    await waitFor(() => {
      expect(screen.queryByText("보관 템플릿")).toBeNull();
    });
  });
});
