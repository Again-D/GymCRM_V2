import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReservationSchedulesQuery } from "./useReservationSchedulesQuery";

type ReservationScheduleResponse = {
  data: Array<{
    scheduleId: number;
    centerId: number;
    scheduleType: "PT";
    trainerName: string;
    slotTitle: string;
    startAt: string;
    endAt: string;
    capacity: number;
    currentCount: number;
    memo: string | null;
  }>;
};

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock
}));

describe("useReservationSchedulesQuery", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("loads reservation schedules", async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          scheduleId: 1,
          centerId: 1,
          scheduleType: "PT",
          trainerName: "Trainer",
          slotTitle: "Morning PT",
          startAt: "2026-03-09T08:00:00Z",
          endAt: "2026-03-09T09:00:00Z",
          capacity: 1,
          currentCount: 0,
          memo: null
        }
      ]
    });

    const { result } = renderHook(() =>
      useReservationSchedulesQuery({
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      await result.current.loadReservationSchedules();
    });

    await waitFor(() => {
      expect(result.current.reservationSchedules).toHaveLength(1);
    });

    expect(apiGetMock).toHaveBeenCalledWith("/api/v1/reservations/schedules");
  });

  it("ignores late reservation schedule responses after reset", async () => {
    let resolveRequest: ((value: ReservationScheduleResponse) => void) | null = null;
    apiGetMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { result } = renderHook(() =>
      useReservationSchedulesQuery({
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      void result.current.loadReservationSchedules();
    });

    act(() => {
      result.current.resetReservationSchedulesQuery();
    });

    await act(async () => {
      resolveRequest?.({
        data: [
          {
            scheduleId: 99,
            centerId: 1,
            scheduleType: "PT",
            trainerName: "Late Trainer",
            slotTitle: "Late PT",
            startAt: "2026-03-09T08:00:00Z",
            endAt: "2026-03-09T09:00:00Z",
            capacity: 1,
            currentCount: 0,
            memo: null
          }
        ]
      });
      await Promise.resolve();
    });

    expect(result.current.reservationSchedules).toEqual([]);
    expect(result.current.reservationSchedulesLoading).toBe(false);
    expect(result.current.reservationSchedulesError).toBeNull();
  });
});
