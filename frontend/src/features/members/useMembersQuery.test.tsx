import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMembersQuery } from "./useMembersQuery";

type MemberResponse = {
  data: Array<{
    memberId: number;
    centerId: number;
    memberName: string;
    phone: string;
    memberStatus: "ACTIVE";
    joinDate: string;
    membershipOperationalStatus: "정상";
    membershipExpiryDate: string;
    remainingPtCount: number;
  }>;
};

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock
}));

describe("useMembersQuery", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("loads members from the shared query source and resets them explicitly", async () => {
    apiGetMock.mockResolvedValue({
      data: [
        {
          memberId: 7,
          centerId: 1,
          memberName: "Kim",
          phone: "010-1111-2222",
          memberStatus: "ACTIVE",
          joinDate: "2026-03-01",
          membershipOperationalStatus: "정상",
          membershipExpiryDate: "2026-04-01",
          remainingPtCount: 8
        }
      ]
    });

    const { result } = renderHook(() =>
      useMembersQuery({
        getDefaultFilters: () => ({ name: "Kim", phone: "", trainerId: "", productId: "", dateFrom: "", dateTo: "" }),
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      await result.current.loadMembers();
    });

    await waitFor(() => {
      expect(result.current.members).toHaveLength(1);
    });

    expect(apiGetMock).toHaveBeenCalledWith("/api/v1/members?name=Kim");

    act(() => {
      result.current.resetMembersQuery();
    });

    expect(result.current.members).toEqual([]);
    expect(result.current.membersLoading).toBe(false);
    expect(result.current.membersQueryError).toBeNull();
  });

  it("ignores late member responses after reset", async () => {
    let resolveRequest: ((value: MemberResponse) => void) | null = null;
    apiGetMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { result } = renderHook(() =>
      useMembersQuery({
        getDefaultFilters: () => ({ name: "", phone: "", trainerId: "", productId: "", dateFrom: "", dateTo: "" }),
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      void result.current.loadMembers();
    });

    act(() => {
      result.current.resetMembersQuery();
    });

    await act(async () => {
      resolveRequest?.({
        data: [
          {
            memberId: 99,
            centerId: 1,
            memberName: "Late Kim",
            phone: "010-0000-0000",
            memberStatus: "ACTIVE",
            joinDate: "2026-03-01",
            membershipOperationalStatus: "정상",
            membershipExpiryDate: "2026-04-01",
            remainingPtCount: 5
          }
        ]
      });
      await Promise.resolve();
    });

    expect(result.current.members).toEqual([]);
    expect(result.current.membersLoading).toBe(false);
    expect(result.current.membersQueryError).toBeNull();
  });

  it("passes membership filter params through to the shared query source", async () => {
    apiGetMock.mockResolvedValue({ data: [] });

    const { result } = renderHook(() =>
      useMembersQuery({
        getDefaultFilters: () => ({
          name: "",
          phone: "",
          trainerId: "11",
          productId: "22",
          dateFrom: "2026-03-10",
          dateTo: "2026-04-10"
        }),
        formatError: () => "load failed"
      })
    );

    await act(async () => {
      await result.current.loadMembers();
    });

    expect(apiGetMock).toHaveBeenCalledWith(
      "/api/v1/members?trainerId=11&productId=22&dateFrom=2026-03-10&dateTo=2026-04-10"
    );
  });
});
