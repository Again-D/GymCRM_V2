import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useTrainerPayrollQuery } from "./useTrainerPayrollQuery";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
}

function TestWrapper({
  client,
  children
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useTrainerPayrollQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("requests trainer payroll with settlement month and unit price", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          settlementMonth: "2026-03",
          sessionUnitPrice: 50000,
          totalCompletedClassCount: 3,
          totalPayrollAmount: 150000,
          settlementStatus: "DRAFT",
          confirmedAt: null,
          rows: []
        },
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useTrainerPayrollQuery({ settlementMonth: "2026-03", sessionUnitPrice: 50000 }),
      {
        wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
      }
    );

    await vi.waitFor(() => {
      expect(result.current.trainerPayroll).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/settlements\/trainer-payroll\?settlementMonth=2026-03&sessionUnitPrice=50000/),
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
    expect(String(fetchMock.mock.calls[0]?.[0] ?? "")).not.toContain("trainerUserId=");
    expect(result.current.trainerPayroll?.settlementStatus).toBe("DRAFT");
  });

  it("does not fetch before a query is submitted", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useTrainerPayrollQuery(null), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
    });

    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/v1/settlements/trainer-payroll"))).toBe(false);
    expect(result.current.trainerPayrollLoading).toBe(false);
    expect(result.current.trainerPayroll).toBeNull();
  });
});
