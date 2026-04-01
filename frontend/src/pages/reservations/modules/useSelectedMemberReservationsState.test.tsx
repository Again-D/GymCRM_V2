import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { useSelectedMemberReservationsState } from "./useSelectedMemberReservationsState";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ children, client }: { children: ReactNode; client: QueryClient }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useSelectedMemberReservationsState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(null);
  });

  const TEST_TIMEOUT = 30000;

  it("loads selected member reservations", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockImplementation(async (url) => {
      if (url.toLowerCase().includes("memberid=101")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: [{ reservationId: 5001, memberId: 101, reservationStatus: "CONFIRMED" }]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSelectedMemberReservationsState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.loadSelectedMemberReservations(101);
    });

    await waitFor(() => {
      expect(result.current.selectedMemberReservations).toHaveLength(1);
    });
    expect(result.current.selectedMemberReservations[0]?.reservationId).toBe(5001);
  }, TEST_TIMEOUT);

  it("creates and mutates local reservation state in mock mode", async () => {
    setMockApiModeForTests(true);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSelectedMemberReservationsState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.loadSelectedMemberReservations(101);
    });

    let reservationId = 0;
    await act(async () => {
      const created = await result.current.createReservation({
        memberId: 101,
        membershipId: 9001,
        scheduleId: 7001
      });
      reservationId = created.reservationId;
    });

    await waitFor(() => {
      expect(result.current.selectedMemberReservations).toHaveLength(1);
    });
    expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("CONFIRMED");

    await act(async () => {
      await result.current.checkInReservation(101, reservationId);
    });
    await act(async () => {
      await result.current.completeReservation(101, reservationId);
    });

    await waitFor(() => {
      expect(result.current.selectedMemberReservations).toHaveLength(1);
      expect(result.current.selectedMemberReservations[0]?.checkedInAt).not.toBeNull();
      expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("COMPLETED");
    });
  }, TEST_TIMEOUT);

  it("creates PT reservations through dedicated flow in mock mode", async () => {
    setMockApiModeForTests(true);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSelectedMemberReservationsState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.loadSelectedMemberReservations(101);
    });

    await act(async () => {
      await result.current.createPtReservation({
        memberId: 101,
        membershipId: 9001,
        trainerUserId: 41,
        startAt: "2026-03-16T10:00:00+09:00",
        memo: "pt",
      });
    });

    await waitFor(() => {
      expect(result.current.selectedMemberReservations).toHaveLength(1);
    });
    expect(result.current.selectedMemberReservations[0]?.reservationStatus).toBe("CONFIRMED");
  }, TEST_TIMEOUT);

  it("creates reservations through live API mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockImplementation(async (url, init) => {
      if (url.includes("/api/v1/reservations") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { reservationId: 9001, memberId: 101, reservationStatus: "CONFIRMED" }
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSelectedMemberReservationsState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    // Directly trigger creation for member 101.
    // The hook will update the CACHE for memberId 101.
    await act(async () => {
      await result.current.createReservation({
        memberId: 101,
        membershipId: 8001,
        scheduleId: 7001,
        memo: "live"
      });
    });

    // Check query data directly.
    await waitFor(() => {
        const data = queryClient.getQueryData<any[]>(["reservations", "list", { memberId: 101 }]);
        expect(Array.isArray(data)).toBe(true);
        expect(data?.some((r: any) => r.reservationId === 9001)).toBe(true);
    }, { timeout: 15000 });
  }, TEST_TIMEOUT);

  it("creates PT reservations through live API mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockImplementation(async (url, init) => {
      if (url.includes("/api/v1/reservations/pt") && init?.method === "POST") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { reservationId: 9002, memberId: 101, reservationStatus: "CONFIRMED" }
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useSelectedMemberReservationsState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.createPtReservation({
        memberId: 101,
        membershipId: 8002,
        trainerUserId: 41,
        startAt: "2026-03-13T10:00:00+09:00",
        memo: "live pt"
      });
    });

    await waitFor(() => {
        const data = queryClient.getQueryData<any[]>(["reservations", "list", { memberId: 101 }]);
        expect(Array.isArray(data)).toBe(true);
        expect(data?.some((r: any) => r.reservationId === 9002)).toBe(true);
    }, { timeout: 15000 });
  }, TEST_TIMEOUT);
});
