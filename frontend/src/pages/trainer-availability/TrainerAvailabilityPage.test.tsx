import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockData } from "../../api/mockData";
import { setMockApiModeForTests } from "../../api/client";
import { AuthStateProvider } from "../../app/auth";
import TrainerAvailabilityPage from "./TrainerAvailabilityPage";

describe("TrainerAvailabilityPage", () => {
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
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    cleanup();
    setMockApiModeForTests(null);
    vi.unstubAllGlobals();
  });

  it("renders the trainer availability snapshot in mock mode", async () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authBootstrapping: false,
          authUser: {
            userId: 41,
            centerId: 1,
            username: "trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"],
          },
        }}
      >
        <TrainerAvailabilityPage />
      </AuthStateProvider>,
    );

    expect(await screen.findByRole("heading", { name: "내 스케줄" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("조회 월"), {
      target: { value: "2026-04" },
    });
    expect((await screen.findAllByText("세미나")).length).toBeGreaterThan(0);
  });

  it("saves weekly rules through the trainer self-service flow", async () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authBootstrapping: false,
          authUser: {
            userId: 41,
            centerId: 1,
            username: "trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"],
          },
        }}
      >
        <TrainerAvailabilityPage />
      </AuthStateProvider>,
    );

    await screen.findByRole("heading", { name: "내 스케줄" });
    fireEvent.change(screen.getByLabelText("조회 월"), {
      target: { value: "2026-04" },
    });
    fireEvent.click(screen.getByRole("button", { name: "주간 스케줄 저장" }));

    await waitFor(() => {
      expect(screen.getByText("기본 주간 스케줄을 저장했습니다.")).toBeTruthy();
    });
  }, 15000);
});
