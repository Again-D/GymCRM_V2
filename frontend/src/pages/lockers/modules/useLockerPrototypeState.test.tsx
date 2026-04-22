import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { resetMockData } from "../../../api/mockData";
import { useLockerPrototypeState } from "./useLockerPrototypeState";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function TestWrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLockerPrototypeState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(true);
    resetMockData();
  });

  it("prefills selected member and invalidates lockers after assign", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useLockerPrototypeState(102), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    // LockerAssignForm uses string for memberId
    expect(result.current.lockerAssignForm.memberId).toBe("102");

    await act(async () => {
      result.current.setLockerAssignForm((prev) => ({
        ...prev,
        lockerSlotId: "4002"
      }));
    });

    await act(async () => {
      await result.current.handleLockerAssign();
    });

    expect(result.current.lockerPanelMessage).toContain("배정");
    expect(invalidateSpy).toHaveBeenCalled();
  });

  it("returns an active locker assignment", async () => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLockerPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      await result.current.handleLockerReturn(6001);
    });

    expect(result.current.lockerPanelMessage).toContain("반납");
  });

  it("creates locker slots through live API mode batch endpoint", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            lockerSlotId: 7001,
            centerId: 1,
            lockerCode: "A-01",
            lockerZone: "A",
            lockerGrade: "STANDARD",
            lockerStatus: "AVAILABLE",
            memo: null,
            createdAt: "2026-03-13T00:00:00Z",
            updatedAt: "2026-03-13T00:00:00Z",
          },
        ],
        message: "라커가 일괄 등록되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-locker-batch",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLockerPrototypeState(), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      result.current.setLockerCreateRows([
        {
          lockerZone: "a",
          lockerNumber: 1,
          lockerGrade: "STANDARD",
          lockerStatus: "AVAILABLE",
          memo: "",
        },
      ]);
    });

    await act(async () => {
      await result.current.handleLockerCreateBatch();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/lockers/batch",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
    expect(result.current.lockerCreatePanelMessage).toBe("라커가 일괄 등록되었습니다.");
  });

  it("assigns lockers through live API mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          lockerAssignmentId: 7001
        },
        message: "라커가 배정되었습니다.",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-locker-assign"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useLockerPrototypeState(102), {
      wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper>,
    });

    await act(async () => {
      result.current.setLockerAssignForm((prev) => ({
        ...prev,
        lockerSlotId: "4002"
      }));
    });

    await act(async () => {
      await result.current.handleLockerAssign();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/lockers/assignments",
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );
    expect(result.current.lockerPanelMessage).toBe("라커가 배정되었습니다.");
  });
});
