import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FoundationProviders } from "../../app/providers";
import CenterSettingsPage from "./CenterSettingsPage";

describe("CenterSettingsPage", () => {
  it("loads the current center profile from mock data", async () => {
    render(
      <FoundationProviders>
        <CenterSettingsPage />
      </FoundationProviders>,
    );

    expect(await screen.findByRole("heading", { name: "시스템 설정" })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("GymCRM 강남점")).toBeTruthy();
    });
  });
});
