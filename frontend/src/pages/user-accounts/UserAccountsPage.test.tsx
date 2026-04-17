import { render, screen, waitFor } from "@testing-library/react";
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
});
