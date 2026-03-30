import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FoundationProviders } from "../../app/providers";
import SettlementsPage from "./SettlementsPage";

describe("SettlementsPage", () => {
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

  it("renders settlement hero and report panels in mock mode", async () => {
    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "정산 리포트" })).toBeTruthy();
    expect(screen.getByText("리포트 조건")).toBeTruthy();
    expect(screen.getByText("거래 집계 결과")).toBeTruthy();
    expect(screen.getByText("총 매출")).toBeTruthy();
  });
});
