import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberContextFallback } from "./MemberContextFallback";

let currentMembersQueryFilters: Record<string, unknown> | null = null;
const refetchMembersMock = vi.fn();

vi.mock("../members/modules/useMembersQuery", () => ({
  useMembersQuery: (filters: Record<string, unknown>) => {
    currentMembersQueryFilters = filters;
    return {
      members: [],
      membersLoading: false,
      membersQueryError: null,
      refetch: refetchMembersMock,
    };
  },
}));

vi.mock("../members/modules/SelectedMemberContext", () => ({
  useSelectedMemberStore: () => ({
    selectMember: vi.fn(),
    selectedMemberLoading: false,
  }),
}));

describe("MemberContextFallback", () => {
  beforeEach(() => {
    currentMembersQueryFilters = null;
    refetchMembersMock.mockReset();
  });

  it("submits the latest keyword instead of replaying the previous debounced query", async () => {
    render(
      <MemberContextFallback
        title="회원 선택"
        description="설명"
        submitLabel="선택"
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("예: 김민수, 010-1234"), {
      target: { value: "김민수" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "조회" }).closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(currentMembersQueryFilters).toMatchObject({
        name: "김민수",
        phone: "김민수",
      });
    });
    expect(refetchMembersMock).not.toHaveBeenCalled();
  });
});
