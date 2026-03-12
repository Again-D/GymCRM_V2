import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useReservationTargetsQuery } from "./useReservationTargetsQuery";

describe("useReservationTargetsQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/reservations/targets?keyword=%EA%B9%80%EB%AF%BC%EC%88%98", {
      credentials: "include"
    });
  });
});
