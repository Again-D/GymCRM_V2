import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { AuthStateProvider } from "../../../app/auth";
import type { MemberQueryFilters } from "./types";
import { useMembersQuery } from "./useMembersQuery";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

const defaultFilters: MemberQueryFilters = {
  name: "",
  phone: "",
  memberStatus: "",
  membershipOperationalStatus: "",
  dateFrom: "",
  dateTo: "",
};

describe("useMembersQuery", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthStateProvider>{children}</AuthStateProvider>
    </QueryClientProvider>
  );

  it("includes member status, summary status, and date filters in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook((filters: MemberQueryFilters) => useMembersQuery(filters), {
      wrapper,
      initialProps: defaultFilters,
    });

    rerender({
      name: "김회원",
      phone: "",
      memberStatus: "INACTIVE",
      membershipOperationalStatus: "홀딩중",
      dateFrom: "2026-03-12",
      dateTo: "2026-04-12",
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/members\?.*name=%EA%B9%80%ED%9A%8C%EC%9B%90/),
        expect.objectContaining({
          credentials: "include",
          method: "GET",
        }),
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/memberStatus=INACTIVE/),
        expect.anything()
      );
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/membershipOperationalStatus=%ED%99%80%EB%94%A9%EC%A4%91/),
        expect.anything()
      );
    });
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
            remainingPtCount: 8,
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
            remainingPtCount: 12,
          },
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useMembersQuery(defaultFilters), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          <AuthStateProvider
            value={{
              authUser: {
                userId: 41,
                username: "trainer-a",
                primaryRole: "ROLE_TRAINER",
                roles: ["ROLE_TRAINER"],
              },
            }}
          >
            {children}
          </AuthStateProvider>
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.members).length(1);
    });
    expect(result.current.members.map((member) => member.memberId)).toEqual([101]);
  });

  it("uses current active filters for requests", async () => {
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
            remainingPtCount: 8,
          },
        ],
        message: "ok",
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = renderHook((filters: MemberQueryFilters) => useMembersQuery(filters), {
      wrapper,
      initialProps: defaultFilters,
    });

    rerender({ ...defaultFilters, name: "김민수" });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/members\?.*name=%EA%B9%80%EB%AF%BC%EC%88%98/),
        expect.anything(),
      );
    });
  });
});
