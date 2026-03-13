import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData } from "../../../api/mockData";
import { invalidateQueryDomains, resetQueryInvalidationStateForTests } from "../../../api/queryInvalidation";
import { useLockerQueries } from "./useLockerQueries";

describe("useLockerQueries", () => {
  beforeEach(() => {
    resetMockData();
    resetQueryInvalidationStateForTests();
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("loads filtered locker slots and assignments separately", async () => {
    const fetchMock = vi.fn(async (input: string) => {
      if (input.startsWith("/api/v1/lockers/slots")) {
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

    const { result } = renderHook(() => useLockerQueries());

    await act(async () => {
      await result.current.loadLockerSlots({ lockerStatus: "AVAILABLE", lockerZone: "A" });
      await result.current.loadLockerAssignments(true);
    });

    expect(result.current.lockerSlots).toHaveLength(1);
    expect(result.current.lockerSlots[0]?.lockerCode).toBe("A-02");
    expect(result.current.lockerAssignments).toHaveLength(1);
    expect(result.current.lockerAssignments[0]?.assignmentStatus).toBe("ACTIVE");
  });

  it("reloads slots after locker slot invalidation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
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
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useLockerQueries());

    await act(async () => {
      await result.current.loadLockerSlots({ lockerStatus: "", lockerZone: "" });
      invalidateQueryDomains(["lockerSlots"]);
      await result.current.loadLockerSlots({ lockerStatus: "", lockerZone: "" });
    });

    expect(result.current.lockerSlots.length).toBeGreaterThan(0);
    expect(result.current.lockerSlots[0]?.lockerCode).toBe("A-02");
  });
});
