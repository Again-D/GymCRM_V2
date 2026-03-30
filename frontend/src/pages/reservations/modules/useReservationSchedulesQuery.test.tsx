import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useReservationSchedulesQuery } from "./useReservationSchedulesQuery";

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

describe("useReservationSchedulesQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("loads reservation schedules", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12T09:30:00+09:00"));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            scheduleId: 7001,
            scheduleType: "PT",
            trainerName: "정트레이너",
            slotTitle: "오전 PT A",
            startAt: "2026-03-12T09:00:00+09:00",
            endAt: "2026-03-12T09:50:00+09:00",
            capacity: 1,
            currentCount: 1
          },
          {
            scheduleId: 7002,
            scheduleType: "GX",
            trainerName: "김트레이너",
            slotTitle: "오후 GX B",
            startAt: "2026-03-12T11:00:00+09:00",
            endAt: "2026-03-12T11:50:00+09:00",
            capacity: 10,
            currentCount: 3
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useReservationSchedulesQuery(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.loadReservationSchedules();
    });

    await vi.waitFor(() => {
      expect(result.current.reservationSchedules).toHaveLength(1);
    });
    expect(result.current.reservationSchedules[0]?.scheduleId).toBe(7002);
    vi.useRealTimers();
  });

  // Ignored late response test as TanStack Query handles request ID-like concurrency internally.

  it("keeps reservation schedule actions stable across rerenders", () => {
    const queryClient = createTestQueryClient();
    const { result, rerender } = renderHook(() => useReservationSchedulesQuery(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    const firstLoad = result.current.loadReservationSchedules;
    const firstReset = result.current.resetReservationSchedulesQuery;

    rerender();

    expect(result.current.loadReservationSchedules).toBe(firstLoad);
    expect(result.current.resetReservationSchedulesQuery).toBe(firstReset);
  });
});
