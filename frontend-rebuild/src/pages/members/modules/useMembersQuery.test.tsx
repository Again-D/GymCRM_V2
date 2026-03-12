import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMembersQuery } from "./useMembersQuery";

describe("useMembersQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("includes summary status and date filters in the request", async () => {
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
          membershipOperationalStatus: "",
          dateFrom: "",
          dateTo: ""
        })
      })
    );

    await result.current.loadMembers({
      name: "김회원",
      membershipOperationalStatus: "홀딩중",
      dateFrom: "2026-03-12",
      dateTo: "2026-04-12"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/members?name=%EA%B9%80%ED%9A%8C%EC%9B%90&membershipOperationalStatus=%ED%99%80%EB%94%A9%EC%A4%91&dateFrom=2026-03-12&dateTo=2026-04-12",
      { credentials: "include" }
    );
  });
});
