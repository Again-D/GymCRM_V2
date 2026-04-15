import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getMockResponse, resetMockData } from "../../../api/mockData";
import { AuthStateProvider } from "../../../app/auth";
import type { MemberDetail, MemberSummary } from "./types";
import { createEmptyMemberForm } from "./types";
import { useMemberManagementState } from "./useMemberManagementState";
import { setMockApiModeForTests } from "../../../api/client";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

describe("useMemberManagementState", () => {
  let queryClient: QueryClient;
  let clearSelectedMember: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    resetMockData();
    setMockApiModeForTests(true);
    queryClient = createTestQueryClient();
    vi.spyOn(queryClient, "invalidateQueries");
    clearSelectedMember = vi.fn();
  });

  it("creates a member in mock mode and invalidates members", async () => {
    const selectMember = vi.fn(async () => true);
    const { result } = renderHook(
      () =>
        useMemberManagementState({
          selectedMemberId: null,
          selectMember,
          clearSelectedMember,
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <AuthStateProvider>{children}</AuthStateProvider>
          </QueryClientProvider>
        ),
      },
    );

    act(() => {
      result.current.startCreateMember();
      result.current.setMemberForm({
        ...createEmptyMemberForm(),
        memberName: "신규회원",
        phone: "010-5555-6666",
        consentSms: true,
      });
    });

    await act(async () => {
      await result.current.submitMemberForm();
    });

    const members = getMockResponse("/api/v1/members")?.data as MemberSummary[];
    const createdMember = members.find((member) => member.memberName === "신규회원");

    expect(createdMember?.memberStatus).toBe("ACTIVE");
    expect(selectMember).toHaveBeenCalledWith(createdMember?.memberId);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["members"] }));
    expect(result.current.modalState.kind).toBe("detail");
  });

  it("refreshes the selected member after edit success", async () => {
    const selectMember = vi.fn(async () => true);
    const { result } = renderHook(
      () =>
        useMemberManagementState({
          selectedMemberId: 101,
          selectMember,
          clearSelectedMember,
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <AuthStateProvider
              value={{
                securityMode: "jwt",
                authBootstrapping: false,
                authUser: { userId: 11, username: "jwt-admin", primaryRole: "ROLE_ADMIN", roles: ["ROLE_ADMIN"] },
              }}
            >
              {children}
            </AuthStateProvider>
          </QueryClientProvider>
        ),
      },
    );

    const originalDetail = getMockResponse("/api/v1/members/101")?.data as MemberDetail;

    act(() => {
      result.current.openMemberEdit(originalDetail);
      result.current.setMemberForm({
        memberName: originalDetail.memberName,
        phone: "010-0000-9999",
        email: originalDetail.email ?? "",
        gender: originalDetail.gender ?? "",
        birthDate: originalDetail.birthDate ?? "",
        memberStatus: originalDetail.memberStatus,
        joinDate: originalDetail.joinDate ?? "",
        consentSms: originalDetail.consentSms,
        consentMarketing: originalDetail.consentMarketing,
        memo: "수정 테스트",
      });
    });

    await act(async () => {
      await result.current.submitMemberForm();
    });

    const updatedDetail = getMockResponse("/api/v1/members/101")?.data as MemberDetail;
    expect(updatedDetail.phone).toBe("010-0000-9999");
    expect(updatedDetail.memo).toBe("수정 테스트");
    expect(selectMember).toHaveBeenCalledWith(101);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["members"] }));
  });

  it("uses memberStatus patch for deactivation in live mode", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          memberId: 101,
          centerId: 1,
          memberName: "김민수",
          phone: "010-1234-5678",
          email: null,
          gender: null,
          birthDate: null,
          memberStatus: "INACTIVE",
          joinDate: "2026-01-04",
          consentSms: true,
          consentMarketing: false,
          memo: null,
        },
        message: "회원 상태가 변경되었습니다.",
        timestamp: "2026-03-20T00:00:00Z",
        traceId: "trace-1",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const selectMember = vi.fn(async () => true);
    const { result } = renderHook(
      () =>
        useMemberManagementState({
          selectedMemberId: 101,
          selectMember,
          clearSelectedMember,
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <AuthStateProvider
              value={{
                securityMode: "jwt",
                authBootstrapping: false,
                authUser: { userId: 11, username: "jwt-admin", primaryRole: "ROLE_ADMIN", roles: ["ROLE_ADMIN"] },
              }}
            >
              {children}
            </AuthStateProvider>
          </QueryClientProvider>
        ),
      },
    );

    await act(async () => {
      await result.current.deactivateMember(101);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/members/101",
      expect.objectContaining({
        credentials: "include",
        method: "PATCH",
        body: JSON.stringify({ memberStatus: "INACTIVE" }),
      }),
    );
    expect(selectMember).toHaveBeenCalledWith(101);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["members"] }));
  });

  it("deletes a member in live mode for admin role", async () => {
    setMockApiModeForTests(false);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: null,
        message: "회원이 삭제되었습니다.",
        timestamp: "2026-03-20T00:00:00Z",
        traceId: "trace-delete",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const selectMember = vi.fn(async () => true);
    const { result } = renderHook(
      () =>
        useMemberManagementState({
          selectedMemberId: 101,
          selectMember,
          clearSelectedMember,
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <AuthStateProvider
              value={{
                securityMode: "jwt",
                authBootstrapping: false,
                authUser: { userId: 11, username: "jwt-admin", primaryRole: "ROLE_ADMIN", roles: ["ROLE_ADMIN"] },
              }}
            >
              {children}
            </AuthStateProvider>
          </QueryClientProvider>
        ),
      },
    );

    await act(async () => {
      await result.current.deleteMember(101);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/members/101",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      }),
    );
    expect(clearSelectedMember).toHaveBeenCalled();
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["members"] }));
  });

  it("blocks member mutations for trainer role", async () => {
    const selectMember = vi.fn(async () => true);
    const { result } = renderHook(
      () =>
        useMemberManagementState({
          selectedMemberId: null,
          selectMember,
          clearSelectedMember,
        }),
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={queryClient}>
            <AuthStateProvider
              value={{
                authUser: { userId: 41, username: "trainer-a", primaryRole: "ROLE_TRAINER", roles: ["ROLE_TRAINER"] },
              }}
            >
              {children}
            </AuthStateProvider>
          </QueryClientProvider>
        ),
      },
    );

    act(() => {
      result.current.startCreateMember();
      result.current.setMemberForm({
        ...createEmptyMemberForm(),
        memberName: "권한없음",
        phone: "010-1111-2222",
      });
    });

    await act(async () => {
      await result.current.submitMemberForm();
    });

    expect(result.current.canManageMembers).toBe(false);
    expect(result.current.memberFormError).toBe("회원 정보를 변경할 권한이 없습니다.");
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
