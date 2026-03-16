import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import CrmPage from "./CrmPage";

describe("CrmPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-crm"
      })
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows trainer unsupported note in live mode", async () => {
    setMockApiModeForTests(false);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "trainer-a",
            role: "ROLE_TRAINER"
          }
        }}
      >
        <CrmPage />
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "Communication Ops" })).toBeTruthy();
    expect(screen.getByText("Role Restricted: Live API Disabled")).toBeTruthy();
    expect(screen.getByText("No transmission data found.")).toBeTruthy();
  });

  it("does not trigger live crm requests from unsupported-role controls", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-crm"
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "trainer-a",
            role: "ROLE_TRAINER"
          }
        }}
      >
        <CrmPage />
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "Communication Ops" })).toBeTruthy();

    const syncButton = screen.getByRole("button", { name: "Sync Logs" });

    expect(syncButton).toHaveProperty("disabled", true);

    fireEvent.click(syncButton);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
