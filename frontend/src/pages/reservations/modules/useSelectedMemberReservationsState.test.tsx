import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useSelectedMemberReservationsState } from "./useSelectedMemberReservationsState";

describe("useSelectedMemberReservationsState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(null);
  });

  it("loads selected member reservations", async () => {
    setMockApiModeForTests(false);
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

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/reservations?memberId=101&version=0",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
    expect(result.current.selectedMemberReservations).toHaveLength(1);
    expect(result.current.selectedMemberReservations[0]?.reservationId).toBe(5001);
  });

  it("creates and mutates local reservation state in mock mode", async () => {
    setMockApiModeForTests(true);
    const { result } = renderHook(() => useSelectedMemberReservationsState());

    let reservationId = 0;
    await act(async () => {
      const created = await result.current.createReservation({
        memberId: 101,
        membershipId: 9001,
        scheduleId: 7001
      });
      reservationId = created.reservationId;
    });

    expect(result.current.selectedMemberReservations).toHaveLength(1);
    expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("CONFIRMED");

    await act(async () => {
      await result.current.checkInReservation(101, reservationId);
      await result.current.completeReservation(101, reservationId);
    });

    expect(result.current.selectedMemberReservations[0]?.checkedInAt).not.toBeNull();
    expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("COMPLETED");
  });

  it("creates PT reservations through dedicated flow in mock mode", async () => {
    setMockApiModeForTests(true);
    const { result } = renderHook(() => useSelectedMemberReservationsState());

    await act(async () => {
      await result.current.createPtReservation({
        memberId: 101,
        membershipId: 9001,
        trainerUserId: 41,
        startAt: "2026-03-16T10:00:00+09:00",
        memo: "pt",
      });
    });

    expect(result.current.selectedMemberReservations).toHaveLength(1);
    expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("CONFIRMED");
  });

  it("creates reservations through live API mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          reservationId: 9001,
          membershipId: 8001,
          scheduleId: 7001,
          reservationStatus: "CONFIRMED",
          reservedAt: "2026-03-13T10:00:00+09:00",
          cancelledAt: null,
          completedAt: null,
          noShowAt: null,
          checkedInAt: null
        },
        message: "예약이 생성되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-create"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSelectedMemberReservationsState());

    await act(async () => {
      await result.current.createReservation({
        memberId: 101,
        membershipId: 8001,
        scheduleId: 7001,
        memo: "live"
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/reservations",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.selectedMemberReservations[0]?.reservationId).toBe(9001);
  });

  it("creates PT reservations through live API mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          reservationId: 9002,
          membershipId: 8001,
          scheduleId: 7100,
          reservationStatus: "CONFIRMED",
          reservedAt: "2026-03-13T10:00:00+09:00",
          cancelledAt: null,
          completedAt: null,
          noShowAt: null,
          checkedInAt: null
        },
        message: "PT 예약이 생성되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-create-pt"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSelectedMemberReservationsState());

    await act(async () => {
      await result.current.createPtReservation({
        memberId: 101,
        membershipId: 8001,
        trainerUserId: 41,
        startAt: "2026-03-13T10:00:00+09:00",
        memo: "live pt"
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/reservations/pt",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.selectedMemberReservations[0]?.reservationId).toBe(9002);
  });
});
