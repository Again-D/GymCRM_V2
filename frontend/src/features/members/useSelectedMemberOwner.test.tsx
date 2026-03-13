import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUserSession } from "../../shared/hooks/useAuthSession";
import { useSelectedMemberOwner } from "./useSelectedMemberOwner";

const { apiGetMock } = vi.hoisted(() => ({
  apiGetMock: vi.fn()
}));

vi.mock("../../shared/api/client", () => ({
  apiGet: apiGetMock
}));

describe("useSelectedMemberOwner", () => {
  beforeEach(() => {
    apiGetMock.mockReset();
  });

  it("loads selected member detail", async () => {
    apiGetMock.mockResolvedValueOnce({
      data: {
        memberId: 7,
        centerId: 1,
        memberName: "김회원",
        phone: "010-1234-5678",
        email: null,
        gender: null,
        birthDate: null,
        memberStatus: "ACTIVE",
        joinDate: "2026-03-01",
        consentSms: true,
        consentMarketing: false,
        memo: null
      }
    });

    const { result } = renderHook(() =>
      useSelectedMemberOwner({
        authUser: { userId: 1, centerId: 1, loginId: "admin", displayName: "관리자", roleCode: "ROLE_CENTER_ADMIN" }
      })
    );

    await act(async () => {
      await result.current.selectMember(7);
    });

    await waitFor(() => {
      expect(result.current.selectedMember?.memberId).toBe(7);
    });
  });

  it("ignores late responses after clear", async () => {
    let resolveRequest: ((value: { data: { memberId: number; centerId: number; memberName: string; phone: string; email: null; gender: null; birthDate: null; memberStatus: "ACTIVE"; joinDate: string; consentSms: boolean; consentMarketing: boolean; memo: null } }) => void) | null = null;

    apiGetMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );

    const { result } = renderHook(() =>
      useSelectedMemberOwner({
        authUser: { userId: 1, centerId: 1, loginId: "admin", displayName: "관리자", roleCode: "ROLE_CENTER_ADMIN" }
      })
    );

    await act(async () => {
      void result.current.selectMember(9);
    });

    act(() => {
      result.current.clearSelectedMember();
    });

    await act(async () => {
      resolveRequest?.({
        data: {
          memberId: 9,
          centerId: 1,
          memberName: "늦은 회원",
          phone: "010-9999-9999",
          email: null,
          gender: null,
          birthDate: null,
          memberStatus: "ACTIVE",
          joinDate: "2026-03-01",
          consentSms: true,
          consentMarketing: false,
          memo: null
        }
      });
      await Promise.resolve();
    });

    expect(result.current.selectedMember).toBeNull();
    expect(result.current.selectedMemberId).toBeNull();
  });

  it("clears selected member when auth identity changes", async () => {
    const adminUser: AuthUserSession = {
      userId: 1,
      centerId: 1,
      loginId: "admin",
      displayName: "관리자",
      roleCode: "ROLE_CENTER_ADMIN"
    };
    const trainerUser: AuthUserSession = {
      userId: 9,
      centerId: 1,
      loginId: "trainer",
      displayName: "트레이너",
      roleCode: "ROLE_TRAINER"
    };

    apiGetMock.mockResolvedValueOnce({
      data: {
        memberId: 3,
        centerId: 1,
        memberName: "선택 회원",
        phone: "010-3333-3333",
        email: null,
        gender: null,
        birthDate: null,
        memberStatus: "ACTIVE",
        joinDate: "2026-03-01",
        consentSms: true,
        consentMarketing: false,
        memo: null
      }
    });

    const { result, rerender } = renderHook(
      ({ authUser }: { authUser: AuthUserSession | null }) =>
        useSelectedMemberOwner({
          authUser
        }),
      {
        initialProps: {
          authUser: adminUser
        }
      }
    );

    await act(async () => {
      await result.current.selectMember(3);
    });

    rerender({ authUser: trainerUser });

    await waitFor(() => {
      expect(result.current.selectedMember).toBeNull();
    });
    expect(result.current.selectedMemberId).toBeNull();
  });
});
