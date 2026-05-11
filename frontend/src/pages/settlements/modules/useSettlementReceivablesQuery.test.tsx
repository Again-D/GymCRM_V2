import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useSettlementReceivablesQuery } from "./useSettlementReceivablesQuery";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSettlementReceivablesQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("requests receivables with baseDate and limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          baseDate: "2026-03-31",
          limit: 10,
          totalOutstandingAmount: 80000,
          receivableCount: 2,
          reminderEligibleCount: 1,
          rows: []
        },
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useSettlementReceivablesQuery({ baseDate: "2026-03-31", limit: 10 }),
      {
        wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
      }
    );

    await vi.waitFor(() => {
      expect(result.current.settlementReceivables).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/settlements\/receivables\?baseDate=2026-03-31&limit=10/),
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
    expect(result.current.settlementReceivables?.reminderEligibleCount).toBe(1);
  });
});
