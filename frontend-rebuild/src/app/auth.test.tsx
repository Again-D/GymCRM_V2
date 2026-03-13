import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { resetRuntimeAuthStorageForTests, AuthStateProvider, useAuthState } from "./auth";
import { setMockApiModeForTests } from "../api/client";

describe("AuthStateProvider bootstrap", () => {
  const originalLocation = window.location.href;

  beforeEach(() => {
    resetRuntimeAuthStorageForTests();
    setMockApiModeForTests(true);
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    resetRuntimeAuthStorageForTests();
    setMockApiModeForTests(null);
    vi.unstubAllGlobals();
    window.history.replaceState({}, "", originalLocation);
  });

  it("boots into jwt anonymous mode from query params in mock mode", async () => {
    window.history.replaceState({}, "", "/members?authMode=jwt&authSession=anon");

    const { result } = renderHook(() => useAuthState(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await waitFor(() => {
      expect(result.current.authBootstrapping).toBe(false);
    });

    expect(result.current.securityMode).toBe("jwt");
    expect(result.current.authUser).toBeNull();
    expect(result.current.isMockMode).toBe(true);
  });

  it("persists runtime preset changes for the next mount in mock mode", async () => {
    const firstRender = renderHook(() => useAuthState(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await waitFor(() => {
      expect(firstRender.result.current.authBootstrapping).toBe(false);
    });

    act(() => {
      firstRender.result.current.setRuntimeAuthPreset("jwt-trainer");
    });

    firstRender.unmount();

    const secondRender = renderHook(() => useAuthState(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await waitFor(() => {
      expect(secondRender.result.current.authBootstrapping).toBe(false);
    });

    expect(secondRender.result.current.securityMode).toBe("jwt");
    expect(secondRender.result.current.authUser?.role).toBe("ROLE_TRAINER");
  });

  it("bootstraps live jwt session from health and refresh", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn<
      (input: RequestInfo | URL) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>
    >();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { securityMode: "jwt", prototypeNoAuth: false },
        message: "ok",
        timestamp: "",
        traceId: ""
      })
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          accessToken: "token-1",
          user: {
            userId: 7,
            loginId: "center-admin",
            displayName: "센터 관리자",
            roleCode: "ROLE_CENTER_ADMIN"
          }
        },
        message: "토큰이 재발급되었습니다.",
        timestamp: "",
        traceId: ""
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAuthState(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await waitFor(() => {
      expect(result.current.authBootstrapping).toBe(false);
    });

    expect(result.current.isMockMode).toBe(false);
    expect(result.current.securityMode).toBe("jwt");
    expect(result.current.authUser?.userId).toBe(7);
    expect(result.current.authStatusMessage).toBe("기존 세션을 복구했습니다.");
  });
});
