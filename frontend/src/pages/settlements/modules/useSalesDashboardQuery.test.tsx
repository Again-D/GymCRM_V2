import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useSalesDashboardQuery } from "./useSalesDashboardQuery";

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

describe("useSalesDashboardQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("requests sales dashboard metrics with filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          baseDate: "2026-03-31",
          expiringWithinDays: 7,
          todayNetSales: 100000,
          monthNetSales: 3000000,
          newMemberCount: 3,
          expiringMemberCount: 5,
          refundCount: 2
        },
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useSalesDashboardQuery({ baseDate: "2026-03-31", expiringWithinDays: 7 }),
      {
        wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
      }
    );

    await vi.waitFor(() => {
      expect(result.current.salesDashboard).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/settlements\/sales-dashboard\?baseDate=2026-03-31&expiringWithinDays=7/),
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
    expect(result.current.salesDashboard?.refundCount).toBe(2);
  });
});
