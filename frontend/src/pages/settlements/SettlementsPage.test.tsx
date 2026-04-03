import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("renders sales analytics tab by default in mock mode", async () => {
    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "정산 운영 센터" })).toBeTruthy();
    expect(screen.getByRole("tab", { selected: true, name: "매출 분석" })).toBeTruthy();
    expect(screen.getByText("리포트 조건")).toBeTruthy();
    expect(screen.getByText("기간 추이 리포트")).toBeTruthy();
    expect(screen.getByText("최근 환불")).toBeTruthy();
  });

  it("switches to trainer payroll tab", async () => {
    render(
      <FoundationProviders>
        <SettlementsPage />
      </FoundationProviders>
    );

    fireEvent.click(await screen.findByRole("tab", { name: "트레이너 정산" }));

    expect(screen.getByRole("tab", { selected: true, name: "트레이너 정산" })).toBeTruthy();
    expect(screen.getByText("트레이너 정산 조회 기능은 다음 구현 단위에서 연결됩니다.")).toBeTruthy();
    expect(screen.queryByText("Invalid Date")).toBeNull();
  });
});
