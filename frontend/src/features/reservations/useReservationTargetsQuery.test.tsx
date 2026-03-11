import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReservationTargetsQuery } from "./useReservationTargetsQuery";

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock
}));

describe("useReservationTargetsQuery", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("loads reservation targets with keyword filter and resets safely", async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          memberId: 11,
          memberCode: "M-11",
          memberName: "김민수",
          phone: "010-1111-2222",
          reservableMembershipCount: 2,
          membershipExpiryDate: "2026-04-10",
          confirmedReservationCount: 1
        }
      ]
    });

    const { result } = renderHook(() =>
      useReservationTargetsQuery({
        formatError: () => "load failed"
      })
    );

    act(() => {
      result.current.setReservationTargetsKeyword("김민수");
    });

    await act(async () => {
      await result.current.loadReservationTargets();
    });

    await waitFor(() => {
      expect(result.current.reservationTargets).toHaveLength(1);
    });

    expect(apiGetMock).toHaveBeenCalledWith("/api/v1/reservations/targets?keyword=%EA%B9%80%EB%AF%BC%EC%88%98");

    act(() => {
      result.current.resetReservationTargetsQuery();
    });

    expect(result.current.reservationTargets).toEqual([]);
    expect(result.current.reservationTargetsKeyword).toBe("");
    expect(result.current.reservationTargetsError).toBeNull();
  });
});
