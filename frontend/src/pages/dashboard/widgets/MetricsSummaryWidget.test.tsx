import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import MetricsSummaryWidget from "./MetricsSummaryWidget";
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

describe("MetricsSummaryWidget", () => {
  const createQueryClient = () => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it("renders the summary values for members count", async () => {
    setMockApiModeForTests(true);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <MetricsSummaryWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial mock data has 2 active members (김민수, 박서연)
    expect(await screen.findByText("2")).toBeTruthy();
    expect(screen.getByText("활성 회원")).toBeTruthy();
    expect(screen.getByText("전체 회원 보기")).toBeTruthy();
  });
});
