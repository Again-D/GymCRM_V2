import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useTrainerSettlementPreviewQuery } from "./useTrainerSettlementPreviewQuery";

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
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTrainerSettlementPreviewQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("requests manager preview with trainer scope and settlement month", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          settlementMonth: "2026-03",
          scope: { trainerId: "ALL", trainerName: "전체 트레이너" },
          period: { start: "2026-03-01", end: "2026-03-31" },
          summary: {
            totalSessions: 21,
            completedSessions: 21,
            cancelledSessions: 0,
            noShowSessions: 0,
            totalAmount: 1230000,
            hasRateWarnings: false
          },
          conflict: {
            hasConflict: false,
            createAllowed: true
          },
          rows: []
        },
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useTrainerSettlementPreviewQuery("manager", {
        trainerId: "ALL",
        settlementMonth: "2026-03"
      }),
      {
        wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
      }
    );

    await vi.waitFor(() => {
      expect(result.current.trainerSettlementPreview).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/settlements\/preview\?settlementMonth=2026-03&trainerId=ALL/),
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
  });

  it("requests trainer preview without trainerId query param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          settlementMonth: "2026-03",
          scope: { trainerId: "41", trainerName: "정트레이너" },
          period: { start: "2026-03-01", end: "2026-03-31" },
          summary: {
            totalSessions: 12,
            completedSessions: 12,
            cancelledSessions: 0,
            noShowSessions: 0,
            totalAmount: 600000,
            hasRateWarnings: false
          },
          conflict: {
            hasConflict: false,
            createAllowed: true
          },
          rows: []
        },
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useTrainerSettlementPreviewQuery("trainer", {
        trainerId: "41",
        settlementMonth: "2026-03"
      }),
      {
        wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
      }
    );

    await vi.waitFor(() => {
      expect(result.current.trainerSettlementPreview).not.toBeNull();
    });

    expect(String(fetchMock.mock.calls[0]?.[0] ?? "")).toContain("/api/v1/settlements/trainer-payroll/my-preview?");
    expect(String(fetchMock.mock.calls[0]?.[0] ?? "")).not.toContain("trainerId=");
  });
});
