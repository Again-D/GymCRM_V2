import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData } from "../../../api/mockData";
import { useLockerQueries } from "./useLockerQueries";

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

describe("useLockerQueries", () => {
  beforeEach(() => {
    resetMockData();
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("loads filtered locker slots and assignments separately", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.includes("/api/v1/lockers/slots")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                lockerSlotId: 4002,
                centerId: 1,
                lockerCode: "A-02",
                lockerZone: "A",
                lockerGrade: "STANDARD",
                lockerStatus: "AVAILABLE",
                memo: null,
                createdAt: "2026-01-01T09:00:00Z",
                updatedAt: "2026-03-12T09:00:00Z"
              }
            ]
          })
        };
      }

      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              lockerAssignmentId: 6001,
              centerId: 1,
              lockerSlotId: 4001,
              lockerCode: "A-01",
              memberId: 101,
              memberName: "김민수",
              assignmentStatus: "ACTIVE",
              assignedAt: "2026-03-01T10:00:00Z",
              startDate: "2026-03-01",
              endDate: "2026-04-01",
              returnedAt: null,
              refundAmount: null,
              returnReason: null,
              memo: "한 달 계약",
              createdAt: "2026-03-01T10:00:00Z",
              updatedAt: "2026-03-01T10:00:00Z"
            }
          ]
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLockerQueries({ lockerStatus: "AVAILABLE", lockerZone: "A" }, true), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.lockerSlots).toHaveLength(1);
      expect(result.current.lockerSlots[0]?.lockerCode).toBe("A-02");
      expect(result.current.lockerAssignments).toHaveLength(1);
      expect(result.current.lockerAssignments[0]?.assignmentStatus).toBe("ACTIVE");
    });
  });

  it("reloads slots after locker slot invalidation", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              lockerSlotId: 4002 + callCount,
              centerId: 1,
              lockerCode: `A-02-${callCount}`,
              lockerZone: "A",
              lockerGrade: "STANDARD",
              lockerStatus: "AVAILABLE",
              memo: null,
              createdAt: "2026-01-01T09:00:00Z",
              updatedAt: "2026-03-12T09:00:00Z"
            }
          ]
        })
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLockerQueries({ lockerStatus: "", lockerZone: "" }), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await vi.waitFor(() => {
      expect(result.current.lockerSlots[0]?.lockerCode).toBeDefined();
    });

    const initialCode = result.current.lockerSlots[0]?.lockerCode;

    await act(async () => {
      await queryClient.invalidateQueries();
    });

    await vi.waitFor(() => {
      expect(result.current.lockerSlots[0]?.lockerCode).not.toBe(initialCode);
    });
  });

  it("keeps locker query actions stable across rerenders", () => {
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(() => useLockerQueries(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const firstRefetchSlots = result.current.refetchLockerSlots;
    const firstRefetchAssignments = result.current.refetchLockerAssignments;

    rerender();

    expect(result.current.refetchLockerSlots).toBe(firstRefetchSlots);
    expect(result.current.refetchLockerAssignments).toBe(firstRefetchAssignments);
  });
});
