import { render, screen, waitFor, within } from "@testing-library/react";
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

    expect(await screen.findByRole("heading", { name: "사용자 계정 관리" })).toBeTruthy();
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
});
