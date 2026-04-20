import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationProviders } from "../../app/providers";
import UserAccountsPage from "./UserAccountsPage";

describe("UserAccountsPage", () => {
  it("loads mock users and renders the account table", async () => {
    render(
      <FoundationProviders>
        <UserAccountsPage />
      </FoundationProviders>,
    );

    await screen.findAllByText("center-admin");
    await waitFor(() => {
      expect(screen.getByText("center-admin")).toBeTruthy();
      expect(screen.getByText("manager-user")).toBeTruthy();
    });
  });

  it("allows super-admin to edit admin user roles", async () => {
    render(
      <FoundationProviders
        authValue={{
          authUser: {
            userId: 99,
            username: "super-admin",
            primaryRole: "ROLE_SUPER_ADMIN",
            roles: ["ROLE_SUPER_ADMIN"],
          },
        }}
      >
        <UserAccountsPage />
      </FoundationProviders>,
    );

    await screen.findAllByText("center-admin");
    await waitFor(() => {
      expect(screen.getAllByText("center-admin").length).toBeGreaterThan(0);
    });

    const adminRows = screen
      .getAllByText("center-admin")
      .map((element) => element.closest("tr"))
      .filter((row): row is HTMLTableRowElement => row != null);

    expect(adminRows.length).toBeGreaterThan(0);
    expect(
      adminRows.some((row) => {
        const roleChangeButton = within(row).getByRole("button", { name: "역할 변경" });
        return !(roleChangeButton as HTMLButtonElement).disabled;
      }),
    ).toBe(true);
  });

  it("creates a user account and refreshes the table", async () => {
    render(
      <FoundationProviders
        authValue={{
          authUser: {
            userId: 99,
            username: "admin-user",
            primaryRole: "ROLE_ADMIN",
            roles: ["ROLE_ADMIN"],
          },
        }}
      >
        <UserAccountsPage />
      </FoundationProviders>,
    );

    await screen.findAllByText("center-admin");
    fireEvent.click(screen.getAllByRole("button", { name: "계정 생성" })[0]);

    fireEvent.change(screen.getByLabelText("로그인 ID"), {
      target: { value: "onboarding-manager" },
    });
    fireEvent.change(screen.getByLabelText("이름"), {
      target: { value: "온보딩 관리자" },
    });
    fireEvent.change(screen.getByLabelText("임시 비밀번호"), {
      target: { value: "Temp-pass-1234!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "생성" }));

    const createdRows = await screen.findAllByText("onboarding-manager");
    const createdRow = createdRows[0];
    const row = createdRow.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row!).getByText("임시 비밀번호")).toBeTruthy();
  }, 20000);
});
