import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AccessSummaryWidget from "./AccessSummaryWidget";
import { setMockApiModeForTests } from "../../../api/client";

// Setup matchMedia mock as Ant Design components might use it
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

describe("AccessSummaryWidget", () => {
  const createQueryClient = () => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it("renders the summary values when mock data is loaded", async () => {
    setMockApiModeForTests(true);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccessSummaryWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // openSessionCount in mock is 1
    expect(await screen.findByText("1")).toBeTruthy();
    expect(screen.getByText("현재 이용중")).toBeTruthy();
    expect(screen.getByText("오늘 입장")).toBeTruthy();
    expect(screen.getByText("출입 관리 열기")).toBeTruthy();
  });

  it("renders a link to the access page", async () => {
    setMockApiModeForTests(true);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccessSummaryWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/access");
  });
});
