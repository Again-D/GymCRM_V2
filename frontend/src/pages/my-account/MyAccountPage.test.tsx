import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as client from "../../api/client";
import { FoundationProviders } from "../../app/providers";
import Login from "../Login";
import MyAccountPage from "./MyAccountPage";

describe("MyAccountPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderAccountPage(authUser: {
    userId: number;
    username: string;
    primaryRole: string;
    roles: string[];
    passwordChangeRequired: boolean;
  }) {
    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authBootstrapping: false,
          authUser,
        }}
      >
        <MemoryRouter initialEntries={["/my-account"]}>
          <Routes>
            <Route path="/my-account" element={<MyAccountPage />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </MemoryRouter>
      </FoundationProviders>,
    );
  }

  it("renders the correct field set for a forced-change session", () => {
    renderAccountPage({
      userId: 11,
      username: "jwt-admin",
      primaryRole: "ROLE_ADMIN",
      roles: ["ROLE_ADMIN"],
      passwordChangeRequired: true,
    });

    expect(screen.getByRole("heading", { name: "내 계정" })).toBeTruthy();
    expect(screen.queryByLabelText("현재 비밀번호")).toBeNull();
    expect(screen.getByLabelText("새 비밀번호")).toBeTruthy();
    expect(screen.getByLabelText("새 비밀번호 확인")).toBeTruthy();
  });

  it("requires the current password for normal sessions", () => {
    renderAccountPage({
      userId: 11,
      username: "jwt-admin",
      primaryRole: "ROLE_ADMIN",
      roles: ["ROLE_ADMIN"],
      passwordChangeRequired: false,
    });

    expect(screen.getByLabelText("현재 비밀번호")).toBeTruthy();
  });

  it("changes the password and returns to login", async () => {
    vi.spyOn(client, "apiPatch").mockResolvedValue({
      success: true,
      data: {
        userId: 11,
        centerId: 1,
        loginId: "jwt-admin",
        userName: "센터 관리자",
        roleCode: "ROLE_ADMIN",
        userStatus: "ACTIVE",
        passwordChangeRequired: false,
        accessRevokedAfter: null,
        revokedRefreshTokenCount: 1,
      },
      message: "비밀번호가 변경되었습니다.",
      timestamp: "",
      traceId: "",
    } as never);

    renderAccountPage({
      userId: 11,
      username: "jwt-admin",
      primaryRole: "ROLE_ADMIN",
      roles: ["ROLE_ADMIN"],
      passwordChangeRequired: true,
    });

    fireEvent.change(screen.getByLabelText("새 비밀번호"), { target: { value: "New-pass-1234!" } });
    fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: "New-pass-1234!" } });
    fireEvent.click(screen.getAllByRole("button", { name: "비밀번호 변경" })[0]);

    await waitFor(() => {
      expect(client.apiPatch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "GymCRM" })).toBeTruthy();
    }, { timeout: 10000 });
  });
});
