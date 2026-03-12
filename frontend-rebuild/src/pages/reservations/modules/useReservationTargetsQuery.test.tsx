import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../../app/auth";
import { useReservationTargetsQuery } from "./useReservationTargetsQuery";

describe("useReservationTargetsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("includes keyword when loading reservation targets", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useReservationTargetsQuery());

    await result.current.loadReservationTargets("김민수");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/reservations/targets?keyword=%EA%B9%80%EB%AF%BC%EC%88%98", {
      credentials: "include"
    });
  });

  it("filters reservation targets to trainer-scoped rows in mock mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            memberId: 101,
            memberCode: "M-0101",
            memberName: "김민수",
            phone: "010-1234-5678",
            reservableMembershipCount: 1,
            membershipExpiryDate: "2026-06-30",
            confirmedReservationCount: 2
          },
          {
            memberId: 102,
            memberCode: "M-0102",
            memberName: "박서연",
            phone: "010-9988-7766",
            reservableMembershipCount: 2,
            membershipExpiryDate: "2026-07-20",
            confirmedReservationCount: 1
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useReservationTargetsQuery(), {
      wrapper: ({ children }) => (
        <AuthStateProvider value={{ authUser: { userId: 41, username: "trainer-a", role: "ROLE_TRAINER" } }}>
          {children}
        </AuthStateProvider>
      )
    });

    await act(async () => {
      await result.current.loadReservationTargets();
    });

    expect(result.current.reservationTargets.map((target) => target.memberId)).toEqual([101]);
  });

  it("reuses cached target results for the same query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            memberId: 101,
            memberCode: "M-0101",
            memberName: "김민수",
            phone: "010-1234-5678",
            reservableMembershipCount: 1,
            membershipExpiryDate: "2026-06-30",
            confirmedReservationCount: 2
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useReservationTargetsQuery(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await act(async () => {
      await result.current.loadReservationTargets("김민수");
      await result.current.loadReservationTargets("김민수");
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
