import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useTrainersQuery } from "./useTrainersQuery";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useTrainersQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("maps trainer query failures to safe user-facing copy", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        message: "raw backend message",
        traceId: "trace-trainers-1",
      }),
    }));

    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () => useTrainersQuery({ centerId: 1, keyword: "", status: "ACTIVE" }),
      { wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper> },
    );

    await vi.waitFor(() => {
      expect(result.current.trainersQueryError).toBe("서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    });
  });
});
