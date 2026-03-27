import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { ApiClientError, setMockApiModeForTests } from "../../api/client";
import { resetMockData } from "../../api/mockData";
import { SelectedMemberProvider } from "../members/modules/SelectedMemberContext";
import ReservationsPage, { getReservationPanelErrorMessage } from "./ReservationsPage";

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

  it("prefers api error detail for reservation panel errors", () => {
    const error = new ApiClientError("비즈니스 규칙 위반입니다.", {
      status: 422,
      code: "BUSINESS_RULE",
      detail: "과거 슬롯은 예약할 수 없습니다.",
      traceId: "trace-422",
    });

    expect(getReservationPanelErrorMessage(error, "예약 생성에 실패했습니다.")).toBe(
      "과거 슬롯은 예약할 수 없습니다.",
    );
  });

  it("falls back to generic error message when api detail is absent", () => {
    expect(
      getReservationPanelErrorMessage(
        new Error("네트워크 오류"),
        "예약 생성에 실패했습니다.",
      ),
    ).toBe("네트워크 오류");
  });

  it("opens the new reservation modal from the workbench and creates a reservation", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-12T09:00:00+09:00").getTime());

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
