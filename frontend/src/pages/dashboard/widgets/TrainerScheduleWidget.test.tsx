import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TrainerScheduleWidget from "./TrainerScheduleWidget";
import { AuthStateProvider } from "../../../app/auth";
import { setMockApiModeForTests } from "../../../api/client";

beforeEach(() => {
  setMockApiModeForTests(false);
  vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TrainerScheduleWidget", () => {
  const createQueryClient = () => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const mockAuthUser = {
    userId: 41,
    username: "trainer-a",
    primaryRole: "ROLE_TRAINER",
    roles: ["ROLE_TRAINER"],
  };

  it("renders only the trainer's own schedules from the default schedules query", async () => {
    const today = new Date();
    const todayText = today.toISOString().split("T")[0] ?? "2026-03-12";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            scheduleId: 7001,
            scheduleType: "PT",
            trainerUserId: 41,
            trainerName: "정트레이너",
            slotTitle: "오전 PT A",
            startAt: `${todayText}T09:00:00+09:00`,
            endAt: `${todayText}T09:50:00+09:00`,
            capacity: 1,
            currentCount: 1,
          },
          {
            scheduleId: 7002,
            scheduleType: "PT",
            trainerUserId: 42,
            trainerName: "김트레이너",
            slotTitle: "오후 PT B",
            startAt: `${todayText}T15:00:00+09:00`,
            endAt: `${todayText}T15:50:00+09:00`,
            capacity: 1,
            currentCount: 0,
          },
        ],
        message: "ok",
        timestamp: `${todayText}T00:00:00Z`,
        traceId: "trace-widget",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthStateProvider
          value={{
            securityMode: "jwt",
            authBootstrapping: false,
            authUser: mockAuthUser,
          }}
        >
          <MemoryRouter>
            <TrainerScheduleWidget />
          </MemoryRouter>
        </AuthStateProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText("오전 PT A")).toBeTruthy();
    expect(screen.queryByText("오후 PT B")).toBeNull();
    expect(screen.queryByText("오늘 예정된 수업이 없습니다.")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/reservations/schedules"),
      expect.anything(),
    );
  });
});
