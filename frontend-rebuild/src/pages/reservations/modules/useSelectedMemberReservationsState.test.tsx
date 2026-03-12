import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSelectedMemberReservationsState } from "./useSelectedMemberReservationsState";

describe("useSelectedMemberReservationsState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads selected member reservations", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            reservationId: 5001,
            membershipId: 9001,
            scheduleId: 7001,
            reservationStatus: "CONFIRMED",
            reservedAt: "2026-03-11T10:00:00+09:00",
            cancelledAt: null,
            completedAt: null,
            noShowAt: null,
            checkedInAt: null
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSelectedMemberReservationsState());

    await act(async () => {
      await result.current.loadSelectedMemberReservations(101);
    });

    expect(result.current.selectedMemberReservations).toHaveLength(1);
    expect(result.current.selectedMemberReservations[0]?.reservationId).toBe(5001);
  });

  it("creates and mutates local reservation state", () => {
    const { result } = renderHook(() => useSelectedMemberReservationsState());

    let reservationId = 0;
    act(() => {
      const created = result.current.createReservation({
        membershipId: 9001,
        scheduleId: 7001
      });
      reservationId = created.reservationId;
    });

    expect(result.current.selectedMemberReservations).toHaveLength(1);
    expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("CONFIRMED");

    act(() => {
      result.current.checkInReservation(reservationId);
      result.current.completeReservation(reservationId);
    });

    expect(result.current.selectedMemberReservations[0]?.checkedInAt).not.toBeNull();
    expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("COMPLETED");
  });
});
