import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { AuthStateProvider } from "../../../app/auth";
import { useReservationTargetsQuery } from "./useReservationTargetsQuery";

describe("useReservationTargetsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
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

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/reservations/targets?keyword=%EA%B9%80%EB%AF%BC%EC%88%98",
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
  });

  it("filters reservation targets to trainer-scoped rows in mock mode", async () => {
    setMockApiModeForTests(true);
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
        <AuthStateProvider value={{ authUser: { userId: 41, username: "trainer-a", primaryRole: "ROLE_TRAINER", roles: ["ROLE_TRAINER"] } }}>
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

    expect(
      fetchMock.mock.calls.filter(([url]) => url === "/api/v1/reservations/targets?keyword=%EA%B9%80%EB%AF%BC%EC%88%98").length
    ).toBe(1);
  });

  it("keeps reservation target actions stable across rerenders", () => {
    const wrapper = ({ children }: { children: ReactNode }) => <AuthStateProvider>{children}</AuthStateProvider>;
    const { result, rerender } = renderHook(() => useReservationTargetsQuery(), { wrapper });

    const firstLoad = result.current.loadReservationTargets;
    const firstSetKeyword = result.current.setReservationTargetsKeyword;

    rerender();

    expect(result.current.loadReservationTargets).toBe(firstLoad);
    expect(result.current.setReservationTargetsKeyword).toBe(firstSetKeyword);
  });
});
