import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { ApiClientError, setMockApiModeForTests } from "../../api/client";
import { resetMockData } from "../../api/mockData";
import { SelectedMemberProvider } from "../members/modules/SelectedMemberContext";
import { getReservationPanelErrorMessage } from "./modules/getReservationPanelErrorMessage";
import ReservationsPage from "./ReservationsPage";
import { FoundationProviders } from "../../app/providers";
import { selectedMemberStore } from "../../app/selectedMemberStore";

function getTopmostDialog() {
  const dialogs = screen.getAllByRole("dialog");
  return dialogs[dialogs.length - 1] as HTMLElement;
}

async function selectAntdOptionIn(container: HTMLElement, index: number, optionName: string) {
  const comboboxes = container.querySelectorAll('input[role="combobox"]');
  const combobox = comboboxes[index] as HTMLInputElement | undefined;
  if (!combobox) {
    throw new Error(`Combobox at index ${index} not found`);
  }
  fireEvent.mouseDown(combobox);
  const options = await screen.findAllByText(optionName);
  fireEvent.click(options[options.length - 1] as HTMLElement);
}

describe("ReservationsPage", () => {
  beforeEach(() => {
    setMockApiModeForTests(true);
    resetMockData();
    selectedMemberStore.getState().reset();
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

  it("falls back to the generic reservation panel message for api errors", () => {
    const error = new ApiClientError("비즈니스 규칙 위반입니다.", {
      status: 422,
      code: "BUSINESS_RULE",
      detail: "과거 슬롯은 예약할 수 없습니다.",
      traceId: "trace-422",
    });

    expect(getReservationPanelErrorMessage(error, "예약 생성에 실패했습니다.")).toBe(
      "예약 생성에 실패했습니다.",
    );
  });

  it("falls back to generic error message for plain errors", () => {
    expect(
      getReservationPanelErrorMessage(
        new Error("네트워크 오류"),
        "예약 생성에 실패했습니다.",
      ),
    ).toBe("예약 생성에 실패했습니다.");
  });

  it("opens the new reservation modal from the workbench and creates a PT reservation", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-16T09:00:00+09:00").getTime());

    render(
      <FoundationProviders>
        <SelectedMemberProvider>
          <ReservationsPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "예약 관리" })).toBeTruthy();

    const memberRow = screen.getByText("김민수").closest("tr");
    expect(memberRow).toBeTruthy();
    fireEvent.click(within(memberRow as HTMLTableRowElement).getByRole("button", { name: "선택 후 조회" }));

    expect(await screen.findByRole("dialog", { name: /예약 워크벤치: 김민수/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "신규 예약 등록" }));

    await screen.findByRole("button", { name: "예약 등록" });
    await waitFor(() => {
      expect(screen.getAllByRole("dialog").length).toBeGreaterThanOrEqual(2);
    });
    const modal = getTopmostDialog();

    await selectAntdOptionIn(modal, 0, "PT · PT 10회권 (잔여 8회)");
    await waitFor(() => {
      expect(screen.getByText("담당 트레이너 기본값: 정트레이너")).toBeTruthy();
    });
    await waitFor(() => {
      const nextModal = getTopmostDialog();
      expect(nextModal.querySelectorAll('input[role="combobox"]').length).toBeGreaterThanOrEqual(3);
    });
    await selectAntdOptionIn(getTopmostDialog(), 2, "10:00 ~ 11:00");
    fireEvent.change(screen.getByPlaceholderText("예약 관련 특이사항 입력"), { target: { value: "현장 등록" } });

    const submitButton = screen.getByRole("button", { name: "예약 등록" }) as HTMLButtonElement;
    await waitFor(() => {
      expect(submitButton.disabled).toBe(false);
    });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/예약 #\d+이\(가\) 생성되었습니다\./)).toBeTruthy();
  }, 15000);

  it("shows PT guidance and keeps submit disabled until required PT fields are selected", async () => {
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-12T09:00:00+09:00").getTime());

    render(
      <FoundationProviders>
        <SelectedMemberProvider>
          <ReservationsPage />
        </SelectedMemberProvider>
      </FoundationProviders>
    );

    const memberRow = await screen.findByText("김민수");
    fireEvent.click(within(memberRow.closest("tr") as HTMLTableRowElement).getByRole("button", { name: "선택 후 조회" }));
    fireEvent.click(await screen.findByRole("button", { name: "신규 예약 등록" }));

    const submitButton = await screen.findByRole("button", { name: "예약 등록" });
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);

    await selectAntdOptionIn(getTopmostDialog(), 0, "PT · PT 10회권 (잔여 8회)");

    expect(await screen.findByText("PT는 트레이너 가능 시간에서 60분 블록으로 예약합니다.")).toBeTruthy();
    expect(await screen.findByText("담당 트레이너 기본값: 정트레이너")).toBeTruthy();
    expect((submitButton as HTMLButtonElement).disabled).toBe(true);
  }, 15000);
});
