import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { AuthStateProvider } from "../../../app/auth";
import { useMembersQuery } from "./useMembersQuery";

describe("useMembersQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("includes member status, summary status, and date filters in the request", async () => {
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

    const { result } = renderHook(() =>
      useMembersQuery({
        getDefaultFilters: () => ({
          name: "",
          phone: "",
          memberStatus: "",
          membershipOperationalStatus: "",
          dateFrom: "",
          dateTo: ""
        })
      })
    );

    await result.current.loadMembers({
      name: "김회원",
      memberStatus: "INACTIVE",
      membershipOperationalStatus: "홀딩중",
      dateFrom: "2026-03-12",
      dateTo: "2026-04-12"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/members?name=%EA%B9%80%ED%9A%8C%EC%9B%90&memberStatus=INACTIVE&membershipOperationalStatus=%ED%99%80%EB%94%A9%EC%A4%91&dateFrom=2026-03-12&dateTo=2026-04-12",
      expect.objectContaining({
        credentials: "include",
        method: "GET"
      })
    );
  });

  it("filters members to trainer-scoped rows in mock mode", async () => {
    setMockApiModeForTests(true);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            memberId: 101,
            centerId: 1,
            memberName: "김민수",
            phone: "010-1234-5678",
            memberStatus: "ACTIVE",
            joinDate: "2026-01-04",
            membershipOperationalStatus: "홀딩중",
            membershipExpiryDate: "2026-06-30",
            remainingPtCount: 8
          },
          {
            memberId: 102,
            centerId: 1,
            memberName: "박서연",
            phone: "010-9988-7766",
            memberStatus: "ACTIVE",
            joinDate: "2025-11-14",
            membershipOperationalStatus: "정상",
            membershipExpiryDate: "2026-07-20",
            remainingPtCount: 12
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () =>
        useMembersQuery({
          getDefaultFilters: () => ({
            name: "",
            phone: "",
            memberStatus: "",
            membershipOperationalStatus: "",
            dateFrom: "",
            dateTo: ""
          })
        }),
      {
        wrapper: ({ children }) => (
          <AuthStateProvider value={{ authUser: { userId: 41, username: "trainer-a", role: "ROLE_TRAINER" } }}>
            {children}
          </AuthStateProvider>
        )
      }
    );

    await act(async () => {
      await result.current.loadMembers();
    });

    expect(result.current.members.map((member) => member.memberId)).toEqual([101]);
  });

  it("reuses cached results for the same query", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            memberId: 101,
            centerId: 1,
            memberName: "김민수",
            phone: "010-1234-5678",
            memberStatus: "ACTIVE",
            joinDate: "2026-01-04",
            membershipOperationalStatus: "홀딩중",
            membershipExpiryDate: "2026-06-30",
            remainingPtCount: 8
          }
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () =>
        useMembersQuery({
          getDefaultFilters: () => ({
            name: "",
            phone: "",
            memberStatus: "",
            membershipOperationalStatus: "",
            dateFrom: "",
            dateTo: ""
          })
        }),
      {
        wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
      }
    );

    await act(async () => {
      await result.current.loadMembers({ name: "김민수" });
      await result.current.loadMembers({ name: "김민수" });
    });

    expect(
      fetchMock.mock.calls.filter(([url]) => url === "/api/v1/members?name=%EA%B9%80%EB%AF%BC%EC%88%98").length
    ).toBe(1);
  });
});
