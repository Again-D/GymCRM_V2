import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { AuthStateProvider } from "../../../app/auth";
import { useTrainerMonthlyPtSummaryQuery } from "./useTrainerMonthlyPtSummaryQuery";

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
    <AuthStateProvider
      value={{
        authUser: {
          userId: 41,
          username: "trainer-a",
          primaryRole: "ROLE_TRAINER",
          roles: ["ROLE_TRAINER"]
        }
      }}
    >
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </AuthStateProvider>
  );
}

describe("useTrainerMonthlyPtSummaryQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("requests trainer monthly pt summary with settlement month", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          settlementMonth: "2026-03",
          trainerUserId: 41,
          trainerName: "정트레이너",
          completedClassCount: 2
        },
        message: "ok"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useTrainerMonthlyPtSummaryQuery("2026-03"),
      {
        wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>
      }
    );

    await vi.waitFor(() => {
      expect(result.current.trainerMonthlyPtSummary).not.toBeNull();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/settlements\/trainer-payroll\/my-summary\?settlementMonth=2026-03&trainerUserId=41/),
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
  });
});
