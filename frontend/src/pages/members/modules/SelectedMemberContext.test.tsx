import { renderHook, act } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setMockApiModeForTests } from "../../../api/client";
import { AuthStateProvider } from "../../../app/auth";
import { SelectedMemberProvider, useSelectedMemberStore } from "./SelectedMemberContext";

describe("SelectedMemberContext", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setMockApiModeForTests(false);
  });

  it("loads member detail into the members-domain owner store", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
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
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-1"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSelectedMemberStore(), {
      wrapper: ({ children }) => <SelectedMemberProvider>{children}</SelectedMemberProvider>
    });

    let loaded = false;
    await act(async () => {
      loaded = await result.current.selectMember(17);
    });

    expect(loaded).toBe(true);
    expect(result.current.selectedMemberId).toBe(17);
    expect(result.current.selectedMember?.memberName).toBe("김회원");
  });

  it("keeps fallback state when trainer selects an out-of-scope member in mock mode", async () => {
    setMockApiModeForTests(true);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useSelectedMemberStore(), {
      wrapper: ({ children }) => (
        <AuthStateProvider value={{ authUser: { userId: 41, username: "trainer-a", primaryRole: "ROLE_TRAINER", roles: ["ROLE_TRAINER"] } }}>
          <SelectedMemberProvider>{children}</SelectedMemberProvider>
        </AuthStateProvider>
      )
    });

    let loaded = true;
    await act(async () => {
      loaded = await result.current.selectMember(102);
    });

    expect(loaded).toBe(false);
    expect(result.current.selectedMemberId).toBeNull();
    expect(result.current.selectedMember).toBeNull();
    expect(result.current.selectedMemberError).toContain("회원 선택 화면");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears selected member when auth identity changes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
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
        timestamp: "2026-03-12T00:00:00Z",
        traceId: "trace-2"
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    let setAuthUser:
      | ((next: { userId: number; username: string; primaryRole: string; roles: string[] } | null) => void)
      | null = null;
    const wrapper = ({ children }: { children: ReactNode }) => {
      const [authUser, setAuthUserState] = useState<{
        userId: number;
        username: string;
        primaryRole: string;
        roles: string[];
      } | null>({ userId: 11, username: "jwt-admin", primaryRole: "ROLE_CENTER_ADMIN", roles: ["ROLE_CENTER_ADMIN"] });
      setAuthUser = setAuthUserState;
      return (
        <AuthStateProvider value={{ authUser }}>
          <SelectedMemberProvider>{children}</SelectedMemberProvider>
        </AuthStateProvider>
      );
    };

    const { result } = renderHook(() => useSelectedMemberStore(), { wrapper });

    await act(async () => {
      await result.current.selectMember(17);
    });

    expect(result.current.selectedMemberId).toBe(17);

    await act(async () => {
      setAuthUser?.({ userId: 41, username: "jwt-trainer-a", primaryRole: "ROLE_TRAINER", roles: ["ROLE_TRAINER"] });
    });

    expect(result.current.selectedMemberId).toBeNull();
    expect(result.current.selectedMember).toBeNull();
    expect(result.current.selectedMemberError).toBeNull();
  });
});
