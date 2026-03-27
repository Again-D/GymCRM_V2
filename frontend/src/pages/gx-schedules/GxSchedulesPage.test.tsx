import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetMockData } from "../../api/mockData";
import { setMockApiModeForTests } from "../../api/client";
import { AuthStateProvider } from "../../app/auth";
import GxSchedulesPage from "./GxSchedulesPage";

describe("GxSchedulesPage", () => {
  beforeEach(() => {
    setMockApiModeForTests(true);
    resetMockData();
  });

  afterEach(() => {
    cleanup();
    setMockApiModeForTests(null);
  });

  it("renders gx schedule snapshot in mock mode", async () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authBootstrapping: false,
          authUser: {
            userId: 1,
            centerId: 1,
            username: "manager-gx",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"],
          },
        }}
      >
        <GxSchedulesPage />
      </AuthStateProvider>,
    );

    expect(await screen.findByRole("heading", { name: "GX 스케줄" })).toBeTruthy();
    expect((await screen.findAllByText("아침 GX")).length).toBeGreaterThan(0);
  });

  it("creates a gx rule through the manager flow in mock mode", async () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authBootstrapping: false,
          authUser: {
            userId: 1,
            centerId: 1,
            username: "manager-gx",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"],
          },
        }}
      >
        <GxSchedulesPage />
      </AuthStateProvider>,
    );

    await screen.findByRole("heading", { name: "GX 스케줄" });
    fireEvent.click(screen.getByRole("button", { name: "새 규칙" }));
    await screen.findByRole("heading", { name: "새 GX 규칙" });

    fireEvent.change(screen.getByLabelText(/수업명/), {
      target: { value: "저녁 스트레칭" },
    });
    fireEvent.change(screen.getByLabelText(/담당 트레이너/), {
      target: { value: "41" },
    });
    fireEvent.click(screen.getByRole("button", { name: "규칙 생성" }));

    await waitFor(() => {
      expect(screen.getByText("GX 반복 규칙을 생성했습니다.")).toBeTruthy();
    });
    expect(screen.getAllByText("저녁 스트레칭").length).toBeGreaterThan(0);
  });

  it("shows field-level validation messages for required rule inputs", async () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authBootstrapping: false,
          authUser: {
            userId: 1,
            centerId: 1,
            username: "manager-gx",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"],
          },
        }}
      >
        <GxSchedulesPage />
      </AuthStateProvider>,
    );

    await screen.findByRole("heading", { name: "GX 스케줄" });
    fireEvent.click(screen.getByRole("button", { name: "새 규칙" }));
    await screen.findByRole("heading", { name: "새 GX 규칙" });

    fireEvent.click(screen.getByRole("button", { name: "규칙 생성" }));

    expect(screen.getByText("수업명을 입력해 주세요.")).toBeTruthy();
    expect(screen.getByText("담당 트레이너를 선택해 주세요.")).toBeTruthy();
  });

  it("shows a time ordering validation message when end time is not after start time", async () => {
    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authBootstrapping: false,
          authUser: {
            userId: 1,
            centerId: 1,
            username: "manager-gx",
            primaryRole: "ROLE_MANAGER",
            roles: ["ROLE_MANAGER"],
          },
        }}
      >
        <GxSchedulesPage />
      </AuthStateProvider>,
    );

    await screen.findByRole("heading", { name: "GX 스케줄" });
    fireEvent.click(screen.getByRole("button", { name: "새 규칙" }));
    await screen.findByRole("heading", { name: "새 GX 규칙" });

    fireEvent.change(screen.getByLabelText(/수업명/), {
      target: { value: "시간 검증 GX" },
    });
    fireEvent.change(screen.getByLabelText(/담당 트레이너/), {
      target: { value: "41" },
    });
    fireEvent.change(screen.getByLabelText(/시작 시간/), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText(/종료 시간/), {
      target: { value: "09:00" },
    });

    fireEvent.click(screen.getByRole("button", { name: "규칙 생성" }));

    expect(screen.getByText("종료 시간은 시작 시간보다 늦어야 합니다.")).toBeTruthy();
  });
});
