import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthStateProvider } from "../../app/auth";
import { setMockApiModeForTests } from "../../api/client";
import ProductsPage from "./ProductsPage";

describe("ProductsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-products"
      })
    })));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps desk users in read-only mode for live products", async () => {
    setMockApiModeForTests(false);

    render(
      <AuthStateProvider
        value={{
          securityMode: "jwt",
          authUser: {
            userId: 21,
            username: "desk-user",
            role: "ROLE_DESK"
          }
        }}
      >
        <ProductsPage />
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "Product & Service Inventory" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create New Item" })).toBeNull();
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
        <ProductsPage />
      </AuthStateProvider>
    );

    expect(await screen.findByRole("heading", { name: "Product & Service Inventory" })).toBeTruthy();
    expect(screen.getByText("Access Restricted.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Create New Item" })).toBeNull();
  });

  it("does not trigger live product requests from unsupported-role controls", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-products"
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
        <ProductsPage />
      </AuthStateProvider>
    );

    expect(await screen.findByText("Access Restricted.")).toBeTruthy();

    const submitButton = screen.getByRole("button", { name: "Apply" });
    const resetButton = screen.getByRole("button", { name: "Clear Filters" });

    expect(submitButton).toHaveProperty("disabled", true);
    expect(resetButton).toHaveProperty("disabled", true);

    fireEvent.click(submitButton);
    fireEvent.click(resetButton);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
