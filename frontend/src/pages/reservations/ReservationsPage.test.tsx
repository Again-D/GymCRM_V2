import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { resetMockData } from "../../api/mockData";
import { setMockApiModeForTests } from "../../api/client";
import { SelectedMemberProvider } from "../members/modules/SelectedMemberContext";
import ReservationsPage from "./ReservationsPage";

describe("ReservationsPage", () => {
  beforeEach(() => {
    setMockApiModeForTests(true);
    resetMockData();
    vi.stubGlobal("matchMedia", vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the new reservation modal from the workbench and creates a reservation", async () => {
    render(
      <AuthStateProvider>
        <SelectedMemberProvider>
          <ReservationsPage />
        </SelectedMemberProvider>
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "예약 관리" })).toBeTruthy();

    const memberRow = screen.getByText("김민수").closest("tr");
    expect(memberRow).toBeTruthy();
    fireEvent.click(within(memberRow as HTMLTableRowElement).getByRole("button", { name: "선택 후 조회" }));

    expect(await screen.findByRole("dialog", { name: /예약 워크벤치: 김민수/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "신규 예약 등록" }));

    expect(await screen.findByRole("dialog", { name: "신규 예약 등록: 김민수" })).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /예약 워크벤치: 김민수/ })).toBeNull();
    });

    fireEvent.change(screen.getByLabelText("예약 회원권"), { target: { value: "9001" } });
    fireEvent.change(screen.getByLabelText("수업 일정"), { target: { value: "7002" } });
    fireEvent.change(screen.getByLabelText("메모"), { target: { value: "현장 등록" } });

    fireEvent.click(screen.getByRole("button", { name: "예약 등록" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "신규 예약 등록: 김민수" })).toBeNull();
    });
    expect(await screen.findByRole("dialog", { name: /예약 워크벤치: 김민수/ })).toBeTruthy();
    expect(await screen.findByText(/예약 #\d+이\(가\) 생성되었습니다\./)).toBeTruthy();
  });
});
