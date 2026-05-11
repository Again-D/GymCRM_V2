import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../api/client";
import { FoundationProviders } from "../../app/providers";
import { appQueryClient } from "../../app/queryClient";
import ProductsPage from "./ProductsPage";

describe("ProductsPage", () => {
  beforeEach(() => {
    appQueryClient.clear();
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
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 21,
            username: "desk-user",
            primaryRole: "ROLE_DESK",
            roles: ["ROLE_DESK"]
          }
        }}
      >
        <ProductsPage />
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "상품 및 서비스 관리" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "신규 상품 등록" })).toBeNull();
  }, 10000);

  it("shows trainer unsupported note in live mode", async () => {
    setMockApiModeForTests(false);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"]
          }
        }}
      >
        <ProductsPage />
      </FoundationProviders>
    );

    expect(await screen.findByRole("heading", { name: "상품 및 서비스 관리" })).toBeTruthy();
    expect(screen.getByText("현재 권한에서는 상품 정보를 조회할 수 없습니다.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "신규 상품 등록" })).toBeNull();
  });

  it("shows promotion metadata in the product table", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            productId: 1,
            centerId: 1,
            productName: "헬스 90일권",
            productCategory: "MEMBERSHIP",
            productType: "DURATION",
            priceAmount: 180000,
            validityDays: 90,
            totalCount: null,
            allowHold: true,
            maxHoldDays: 30,
            maxHoldCount: 1,
            allowHoldBypass: true,
            allowTransfer: false,
            assignedTrainerId: null,
            promotion: {
              promotionDiscountType: "PERCENT",
              promotionDiscountValue: 15,
              promotionStartDate: "2026-05-01",
              promotionEndDate: "2026-05-31"
            },
            productStatus: "ACTIVE",
            description: "기본 헬스 이용권"
          }
        ],
        message: "ok",
        timestamp: "2026-03-13T00:00:00Z",
        traceId: "trace-products"
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 21,
            username: "desk-user",
            primaryRole: "ROLE_DESK",
            roles: ["ROLE_DESK"]
          }
        }}
      >
        <ProductsPage />
      </FoundationProviders>
    );

    expect(await screen.findByText(/15%/)).toBeTruthy();
    expect(screen.getByText(/2026-05-01/)).toBeTruthy();
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
      <FoundationProviders
        authValue={{
          securityMode: "jwt",
          authUser: {
            userId: 41,
            username: "trainer-a",
            primaryRole: "ROLE_TRAINER",
            roles: ["ROLE_TRAINER"]
          }
        }}
      >
        <ProductsPage />
      </FoundationProviders>
    );

    expect(await screen.findByText("현재 권한에서는 상품 정보를 조회할 수 없습니다.")).toBeTruthy();

    const submitButton = screen.getByRole("button", { name: /적용$/ });
    const resetButton = screen.getByRole("button", { name: "필터 초기화" });
    const baselineCallCount = fetchMock.mock.calls.length;

    expect(submitButton).toHaveProperty("disabled", true);
    expect(resetButton).toHaveProperty("disabled", true);

    fireEvent.click(submitButton);
    fireEvent.click(resetButton);

    expect(fetchMock).toHaveBeenCalledTimes(baselineCallCount);
  });
});
