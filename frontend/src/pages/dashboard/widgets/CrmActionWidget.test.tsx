import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CrmActionWidget from "./CrmActionWidget";
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

describe("CrmActionWidget", () => {
  const createQueryClient = () => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  it("renders a list of members needing action when mock data is loaded", async () => {
    setMockApiModeForTests(true);
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CrmActionWidget />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial mock data has 김민수 (홀딩중), 이도윤 (없음)
    expect(await screen.findByText("김민수")).toBeTruthy();
    expect(screen.getByText("홀딩중")).toBeTruthy();
    expect(screen.getByText("CRM 회원 목록")).toBeTruthy();
  });
});
