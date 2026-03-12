import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SelectedMemberProvider, useSelectedMemberStore } from "./SelectedMemberContext";

describe("SelectedMemberContext", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
