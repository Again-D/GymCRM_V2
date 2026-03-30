import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData } from "../../../api/mockData";
import { useAccessPrototypeState } from "./useAccessPrototypeState";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useAccessPrototypeState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
    resetMockData();
  });

  it("invalidates access queries after entry", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useAccessPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.handleAccessEntry(102);
    });

    expect(result.current.accessPanelMessage).toContain("입장을 처리했습니다.");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("reports an error when exit is attempted without an open session", async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAccessPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.handleAccessExit(102);
    });

    expect(result.current.accessPanelError).toBe("현재 입장중인 세션이 없습니다.");
  });

  it("uses live entry API in live mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          accessEventId: 7001,
          memberId: 102,
          membershipId: null,
          reservationId: null,
          eventType: "ENTRY_GRANTED",
          denyReason: null,
          processedAt: "2026-03-13T10:00:00+09:00"
        },
        message: "입장 처리되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-entry"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAccessPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.handleAccessEntry(102);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/access/entry",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.accessPanelMessage).toBe("입장 처리되었습니다.");
  });
});
