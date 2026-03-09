import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthSession } from "./useAuthSession";

const { apiGetMock, apiPostMock, configureApiAuthMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  configureApiAuthMock: vi.fn()
}));

vi.mock("../api/client", () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;

    constructor(message: string, options: { status: number }) {
      super(message);
      this.status = options.status;
    }
  },
  apiGet: apiGetMock,
  apiPost: apiPostMock,
  configureApiAuth: configureApiAuthMock
}));

describe("useAuthSession", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
    apiPostMock.mockReset();
    configureApiAuthMock.mockReset();
  });

  it("bootstraps jwt auth and clears protected UI on logout", async () => {
    const onProtectedUiReset = vi.fn();

    apiGetMock.mockResolvedValue({
      data: { securityMode: "jwt", prototypeNoAuth: false }
    });
    apiPostMock
      .mockResolvedValueOnce({
        data: {
          accessToken: "token-1",
          user: {
            userId: 3,
            centerId: 1,
            loginId: "desk-user",
            displayName: "Desk User",
            roleCode: "ROLE_DESK"
          }
        },
        message: "restored"
      })
      .mockResolvedValueOnce({
        data: undefined,
        message: "logged out"
      });

    const { result } = renderHook(() =>
      useAuthSession({
        formatError: () => "auth failed",
        onProtectedUiReset
      })
    );

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(onProtectedUiReset).toHaveBeenCalledTimes(1);
  });

  it("uses the configured unauthorized callback to clear session and reset protected UI", async () => {
    const onProtectedUiReset = vi.fn();

    apiGetMock.mockResolvedValue({
      data: { securityMode: "jwt", prototypeNoAuth: false }
    });
    apiPostMock.mockResolvedValue({
      data: {
        accessToken: "token-1",
        user: {
          userId: 3,
          centerId: 1,
          loginId: "desk-user",
          displayName: "Desk User",
          roleCode: "ROLE_DESK"
        }
      },
      message: "restored"
    });

    const { result } = renderHook(() =>
      useAuthSession({
        formatError: () => "auth failed",
        onProtectedUiReset
      })
    );

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    const authHooks = configureApiAuthMock.mock.calls[configureApiAuthMock.mock.calls.length - 1]?.[0];
    expect(authHooks).toBeTruthy();

    act(() => {
      authHooks.onUnauthorized();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.authStatusMessage).toBe("세션이 만료되어 다시 로그인해야 합니다.");
    expect(onProtectedUiReset).toHaveBeenCalledTimes(1);
  });
});
