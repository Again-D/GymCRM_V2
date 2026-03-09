import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLockerQueries } from "./useLockerQueries";

type SlotsResponse = {
  data: Array<{
    lockerSlotId: number;
    centerId: number;
    lockerCode: string;
    lockerZone: string | null;
    lockerGrade: string | null;
    lockerStatus: "AVAILABLE";
    memo: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

type AssignmentsResponse = {
  data: Array<{
    lockerAssignmentId: number;
    centerId: number;
    lockerSlotId: number;
    memberId: number;
    assignmentStatus: "ACTIVE";
    assignedAt: string;
    startDate: string;
    endDate: string;
    returnedAt: string | null;
    refundAmount: number | null;
    returnReason: string | null;
    memo: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock
}));

describe("useLockerQueries", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("loads locker slots with filters and active assignments", async () => {
    apiGetMock
      .mockResolvedValueOnce({
        data: [
          {
            lockerSlotId: 1,
            centerId: 1,
            lockerCode: "A-01",
            lockerZone: "A",
            lockerGrade: null,
            lockerStatus: "AVAILABLE",
            memo: null,
            createdAt: "2026-03-01T00:00:00Z",
            updatedAt: "2026-03-09T00:00:00Z"
          }
        ]
      })
      .mockResolvedValueOnce({
        data: [
          {
            lockerAssignmentId: 10,
            centerId: 1,
            lockerSlotId: 2,
            memberId: 77,
            assignmentStatus: "ACTIVE",
            assignedAt: "2026-03-09T10:00:00Z",
            startDate: "2026-03-09",
            endDate: "2026-04-09",
            returnedAt: null,
            refundAmount: null,
            returnReason: null,
            memo: null,
            createdAt: "2026-03-09T10:00:00Z",
            updatedAt: "2026-03-09T10:00:00Z"
          }
        ]
      });

    const { result } = renderHook(() =>
      useLockerQueries({
        getDefaultFilters: () => ({ lockerStatus: "AVAILABLE", lockerZone: "A" }),
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      await result.current.loadLockerSlots();
      await result.current.loadLockerAssignments(true);
    });

    await waitFor(() => {
      expect(result.current.lockerSlots).toHaveLength(1);
      expect(result.current.lockerAssignments).toHaveLength(1);
    });

    expect(apiGetMock).toHaveBeenNthCalledWith(1, "/api/v1/lockers/slots?lockerStatus=AVAILABLE&lockerZone=A");
    expect(apiGetMock).toHaveBeenNthCalledWith(2, "/api/v1/lockers/assignments?activeOnly=true");
  });

  it("ignores late locker responses after reset", async () => {
    let resolveSlots: ((value: SlotsResponse) => void) | null = null;
    let resolveAssignments: ((value: AssignmentsResponse) => void) | null = null;
    apiGetMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSlots = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAssignments = resolve;
          })
      );

    const { result } = renderHook(() =>
      useLockerQueries({
        getDefaultFilters: () => ({ lockerStatus: "", lockerZone: "" }),
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      void result.current.loadLockerSlots();
      void result.current.loadLockerAssignments(false);
    });

    act(() => {
      result.current.resetLockerQueries();
    });

    await act(async () => {
      resolveSlots?.({
        data: [
          {
            lockerSlotId: 99,
            centerId: 1,
            lockerCode: "LATE",
            lockerZone: "B",
            lockerGrade: null,
            lockerStatus: "AVAILABLE",
            memo: null,
            createdAt: "2026-03-01T00:00:00Z",
            updatedAt: "2026-03-09T00:00:00Z"
          }
        ]
      });
      resolveAssignments?.({
        data: [
          {
            lockerAssignmentId: 88,
            centerId: 1,
            lockerSlotId: 5,
            memberId: 22,
            assignmentStatus: "ACTIVE",
            assignedAt: "2026-03-09T10:00:00Z",
            startDate: "2026-03-09",
            endDate: "2026-04-09",
            returnedAt: null,
            refundAmount: null,
            returnReason: null,
            memo: null,
            createdAt: "2026-03-09T10:00:00Z",
            updatedAt: "2026-03-09T10:00:00Z"
          }
        ]
      });
      await Promise.resolve();
    });

    expect(result.current.lockerSlots).toEqual([]);
    expect(result.current.lockerAssignments).toEqual([]);
    expect(result.current.lockerSlotsLoading).toBe(false);
    expect(result.current.lockerAssignmentsLoading).toBe(false);
    expect(result.current.lockerQueryError).toBeNull();
  });
});
