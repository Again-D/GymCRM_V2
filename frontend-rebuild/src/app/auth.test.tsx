import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { AuthStateProvider, resetRuntimeAuthStorageForTests, useAuthState } from "./auth";

describe("AuthStateProvider runtime bootstrap", () => {
  const originalLocation = window.location.href;

  beforeEach(() => {
    resetRuntimeAuthStorageForTests();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    resetRuntimeAuthStorageForTests();
    window.history.replaceState({}, "", originalLocation);
  });

  it("boots into jwt anonymous mode from query params", async () => {
    window.history.replaceState({}, "", "/members?authMode=jwt&authSession=anon");

    const { result } = renderHook(() => useAuthState(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.securityMode).toBe("jwt");
    expect(result.current.authBootstrapping).toBe(false);
    expect(result.current.authUser).toBeNull();
  });

  it("persists runtime preset changes for the next mount", async () => {
    const firstRender = renderHook(() => useAuthState(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      firstRender.result.current.setRuntimeAuthPreset("jwt-trainer");
    });

    firstRender.unmount();

    const secondRender = renderHook(() => useAuthState(), {
      wrapper: ({ children }) => <AuthStateProvider>{children}</AuthStateProvider>
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(secondRender.result.current.securityMode).toBe("jwt");
    expect(secondRender.result.current.authUser?.role).toBe("ROLE_TRAINER");
  });
});
