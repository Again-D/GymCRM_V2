import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { setMockApiModeForTests } from "../../../api/client";
import { useSelectedMemberMembershipsQuery } from "./useSelectedMemberMembershipsQuery";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ children, client }: { children: ReactNode; client: QueryClient }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSelectedMemberMembershipsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
  });

  it("keeps membership query actions stable across rerenders", () => {
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(() => useSelectedMemberMembershipsQuery(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const firstLoad = result.current.loadSelectedMemberMemberships;
    const firstReset = result.current.resetSelectedMemberMembershipsQuery;

    rerender();

    expect(result.current.loadSelectedMemberMemberships).toBe(firstLoad);
    expect(result.current.resetSelectedMemberMembershipsQuery).toBe(firstReset);
  });
});
