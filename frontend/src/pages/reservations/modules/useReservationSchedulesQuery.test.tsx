import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useReservationSchedulesQuery } from "./useReservationSchedulesQuery";

describe("useReservationSchedulesQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("loads reservation schedules", async () => {
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
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useReservationSchedulesQuery());

    await act(async () => {
      await result.current.loadReservationSchedules();
    });

    expect(result.current.reservationSchedules).toHaveLength(1);
    expect(result.current.reservationSchedules[0]?.scheduleId).toBe(7001);
  });

  it("ignores late responses after reset", async () => {
    let resolveFetch!: (value: {
      ok: boolean;
      json: () => Promise<{
        success: boolean;
        data: Array<{
          scheduleId: number;
          scheduleType: "PT" | "GX";
          trainerName: string;
          slotTitle: string;
          startAt: string;
          endAt: string;
          capacity: number;
          currentCount: number;
        }>;
        message: string;
        timestamp: string;
        traceId: string;
      }>;
    }) => void;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useReservationSchedulesQuery());

    const pendingLoad = result.current.loadReservationSchedules();

    act(() => {
      result.current.resetReservationSchedulesQuery();
    });

    await act(async () => {
      resolveFetch({
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              scheduleId: 7999,
              scheduleType: "PT",
              trainerName: "지연 응답",
              slotTitle: "late schedule",
              startAt: "2026-03-12T10:00:00+09:00",
              endAt: "2026-03-12T10:50:00+09:00",
              capacity: 1,
              currentCount: 0
            }
          ],
          message: "ok",
          timestamp: "2026-03-12T00:00:00Z",
          traceId: "trace-late"
        })
      });
      await pendingLoad;
    });

    expect(result.current.reservationSchedules).toEqual([]);
    expect(result.current.reservationSchedulesLoading).toBe(false);
  });

  it("keeps reservation schedule actions stable across rerenders", () => {
    const { result, rerender } = renderHook(() => useReservationSchedulesQuery());

    const firstLoad = result.current.loadReservationSchedules;
    const firstReset = result.current.resetReservationSchedulesQuery;

    rerender();

    expect(result.current.loadReservationSchedules).toBe(firstLoad);
    expect(result.current.resetReservationSchedulesQuery).toBe(firstReset);
  });
});
