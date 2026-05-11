import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../api/client";
import { resetMockData } from "../../api/mockData";
import { FoundationProviders } from "../../app/providers";
import { appQueryClient } from "../../app/queryClient";
import CrmPage from "./CrmPage";

describe("CrmPage", () => {
  beforeEach(() => {
    appQueryClient.clear();
    setMockApiModeForTests(true);
    resetMockData();
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

  it("runs the inactive-member trigger in mock mode", async () => {
    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "manager-a",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"]
          }
        }}
      >
        <CrmPage />
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "CRM 운영" })).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /장기 미방문 적재/ }));
    });

    expect(await screen.findByText("30일 기준 장기 미방문 메시지 1건을 큐에 적재했습니다.")).toBeTruthy();
  });

  it("shows fallback delivery mode and failure hints in history", async () => {
    setMockApiModeForTests(false);
    installMockFetch(
      [],
      [
        {
          crmMessageEventId: 12011,
          memberId: 101,
          membershipId: 9001,
          eventType: "MEMBERSHIP_EXPIRY_REMINDER",
          channelType: "KAKAO",
          deliveryMode: "SMS_FALLBACK",
          sendStatus: "SENT",
          attemptCount: 1,
          lastAttemptedAt: "2026-03-13T09:10:00+09:00",
          nextAttemptAt: null,
          sentAt: "2026-03-13T09:10:03+09:00",
          failedAt: null,
          lastErrorMessage: null,
          traceId: "trace-crm-12011",
          createdAt: "2026-03-13T09:05:00+09:00",
        },
        {
          crmMessageEventId: 12012,
          memberId: 102,
          membershipId: 9011,
          eventType: "EVENT_CAMPAIGN",
          channelType: "EMAIL",
          deliveryMode: "SMS_FALLBACK",
          sendStatus: "DEAD",
          attemptCount: 3,
          lastAttemptedAt: "2026-03-13T10:10:00+09:00",
          nextAttemptAt: null,
          sentAt: null,
          failedAt: "2026-03-13T10:10:00+09:00",
          lastErrorMessage: "fallback delivery failed",
          traceId: "trace-crm-12012",
          createdAt: "2026-03-13T10:00:00+09:00",
        },
      ],
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

    expect((await screen.findAllByText("SMS 폴백")).length).toBeGreaterThan(0);
    expect(screen.getByText("실패 사유는 운영 로그 확인")).toBeTruthy();
  });

  it("triggers long-term inactive campaign using the selected sendable template", async () => {
    setMockApiModeForTests(false);
    installMockFetch(
      [
        {
          templateId: 501,
          templateCode: "INACTIVE_WINBACK",
          templateName: "장기 미방문 리마인드",
          channelType: "KAKAO",
          templateType: "MARKETING",
          templateBody: "오랜만에 다시 방문해 주세요",
          reviewStatus: "APPROVED",
          operationalStatus: "SENDABLE",
          sendable: true,
          isActive: true,
          createdAt: "2026-03-13T00:00:00Z",
          updatedAt: "2026-03-13T00:00:00Z",
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

    expect(await screen.findByText("장기 미방문 캠페인")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("장기 미방문 일수"), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByLabelText("예약 발송 시각"), {
      target: { value: "2026-05-12T10:00:00+09:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "장기 미방문 적재" }));

    await waitFor(() => {
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
        "/api/v1/crm/messages/triggers/long-term-inactive",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });
});
