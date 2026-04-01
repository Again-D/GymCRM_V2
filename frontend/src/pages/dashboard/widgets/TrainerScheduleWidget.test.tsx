import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TrainerScheduleWidget from "./TrainerScheduleWidget";
import { AuthStateProvider } from "../../../app/auth";
import { setMockApiModeForTests } from "../../../api/client";

beforeEach(() => {
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

  it("renders a list of trainer's own schedules", async () => {
    setMockApiModeForTests(true);
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

    expect(await screen.findByText(/오늘 예정된 수업|오전 PT A|오후 PT B/)).toBeTruthy();
  });
});
