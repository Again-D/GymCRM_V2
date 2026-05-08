import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../api/client";
import MemberQrPage from "./MemberQrPage";

describe("MemberQrPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setMockApiModeForTests(false);
    vi.stubGlobal("fetch", createFetchMock());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    setMockApiModeForTests(null);
    vi.unstubAllGlobals();
  });

  it("renders a QR session and refreshes it after the token expires", async () => {
    render(
      <MemoryRouter initialEntries={["/member-qr?token=bootstrap-token"]}>
        <MemberQrPage />
      </MemoryRouter>,
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("member-qr-token").textContent).toContain("qr-token-1");
    expect(screen.getByText("홍길동님의 출입 QR")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "QR 새로고침" }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("member-qr-token").textContent).toContain("qr-token-2");
  });

  it("shows a retry state when the bootstrap token is missing", async () => {
    render(
      <MemoryRouter initialEntries={["/member-qr"]}>
        <MemberQrPage />
      </MemoryRouter>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("회원 QR을 불러올 수 없습니다")).toBeTruthy();
    expect(screen.getByText("회원 QR 링크 토큰이 없습니다. 다시 열어주세요.")).toBeTruthy();
  });
});

function createFetchMock() {
  let requestCount = 0;

  return vi.fn(async () => {
    requestCount += 1;
    const tokenSuffix = requestCount;
    const issuedAt = "2026-05-08T10:00:00Z";
    const expiresAt = requestCount === 1
      ? "2026-05-08T10:00:01Z"
      : "2026-05-08T10:00:02Z";

    return {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          memberId: 101,
          memberName: "홍길동",
          qrToken: `qr-token-${tokenSuffix}`,
          issuedAt,
          expiresAt,
          ttlSeconds: 1,
          bootstrapExpiresAt: "2026-05-08T23:59:59Z",
        },
        message: "회원 QR 세션이 갱신되었습니다.",
        timestamp: "2026-05-08T10:00:00Z",
        traceId: "trace-member-qr",
      }),
    };
  });
}
