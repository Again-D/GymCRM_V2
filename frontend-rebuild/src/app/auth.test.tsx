import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { resetRuntimeAuthStorageForTests, AuthStateProvider, useAuthState } from "./auth";
import { setMockApiModeForTests } from "../api/client";
import { SelectedMemberProvider, useSelectedMemberStore } from "../pages/members/modules/SelectedMemberContext";

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

  it("logs in through the live auth endpoint", async () => {
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
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        data: null,
        message: "세션 없음",
        timestamp: "",
        traceId: "",
        error: { code: "TOKEN_INVALID", status: 401, detail: "invalid" }
      })
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          accessToken: "token-login",
          user: {
            userId: 11,
            loginId: "center-admin",
            displayName: "센터 관리자",
            roleCode: "ROLE_CENTER_ADMIN"
          }
        },
        message: "로그인되었습니다.",
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

    await act(async () => {
      await result.current.login("center-admin", "dev-admin-1234!");
    });

    expect(result.current.authUser?.userId).toBe(11);
    expect(result.current.authStatusMessage).toBe("로그인되었습니다.");
  });

  it("clears selected member when logging out from a live session", async () => {
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
          accessToken: "token-refresh",
          user: {
            userId: 11,
            loginId: "center-admin",
            displayName: "센터 관리자",
            roleCode: "ROLE_CENTER_ADMIN"
          }
        },
        message: "기존 세션을 복구했습니다.",
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
          memberId: 17,
          centerId: 1,
          memberName: "김회원",
          phone: "010-0000-0000",
          email: null,
          gender: null,
          birthDate: null,
          memberStatus: "ACTIVE",
          joinDate: "2026-03-01",
          consentSms: true,
          consentMarketing: false,
          memo: null
        },
        message: "ok",
        timestamp: "",
        traceId: "trace-member"
      })
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: null,
        message: "로그아웃되었습니다.",
        timestamp: "",
        traceId: ""
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () => ({
        auth: useAuthState(),
        selected: useSelectedMemberStore()
      }),
      {
        wrapper: ({ children }) => (
          <AuthStateProvider>
            <SelectedMemberProvider>{children}</SelectedMemberProvider>
          </AuthStateProvider>
        )
      }
    );

    await waitFor(() => {
      expect(result.current.auth.authBootstrapping).toBe(false);
    });

    await act(async () => {
      await result.current.selected.selectMember(17);
    });

    expect(result.current.selected.selectedMemberId).toBe(17);

    await act(async () => {
      await result.current.auth.logout();
    });

    expect(result.current.auth.authUser).toBeNull();
    expect(result.current.selected.selectedMemberId).toBeNull();
    expect(result.current.selected.selectedMember).toBeNull();
  });
});
