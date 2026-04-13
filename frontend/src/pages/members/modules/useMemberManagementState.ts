import { useMemo, useState } from "react";

import { apiPatch, apiPost, isMockApiMode } from "../../../api/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../app/queryHelpers";
import { useAuthState } from "../../../app/auth";
import { hasAnyRole } from "../../../app/roles";
import {
  createEmptyMemberForm,
  createMemberFormFromDetail,
  type MemberDetail,
  type MemberFormState,
  type MembersModalState,
} from "./types";

function asNullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildCreateMemberInput(memberForm: MemberFormState) {
  const memberName = memberForm.memberName.trim();
  if (!memberName) {
    return { error: "회원 이름을 입력해야 합니다." } as const;
  }

  const phone = memberForm.phone.trim();
  if (!phone) {
    return { error: "연락처를 입력해야 합니다." } as const;
  }

  return {
    value: {
      memberName,
      phone,
      email: asNullableText(memberForm.email),
      gender: memberForm.gender || null,
      birthDate: asNullableText(memberForm.birthDate),
      memberStatus: memberForm.memberStatus,
      joinDate: asNullableText(memberForm.joinDate),
      consentSms: memberForm.consentSms,
      consentMarketing: memberForm.consentMarketing,
      memo: asNullableText(memberForm.memo),
    },
  } as const;
}

function buildUpdateMemberInput(memberForm: MemberFormState) {
  const memberName = memberForm.memberName.trim();
  if (!memberName) {
    return { error: "회원 이름을 입력해야 합니다." } as const;
  }

  const phone = memberForm.phone.trim();
  if (!phone) {
    return { error: "연락처를 입력해야 합니다." } as const;
  }

  return {
    value: {
      memberName,
      phone,
      email: asNullableText(memberForm.email),
      gender: memberForm.gender || null,
      birthDate: asNullableText(memberForm.birthDate),
      memberStatus: memberForm.memberStatus,
      joinDate: asNullableText(memberForm.joinDate),
      consentSms: memberForm.consentSms,
      consentMarketing: memberForm.consentMarketing,
      memo: asNullableText(memberForm.memo),
    },
  } as const;
}

function canManageMember(authUser: ReturnType<typeof useAuthState>["authUser"]) {
  return hasAnyRole(authUser, ["ROLE_MANAGER", "ROLE_DESK"]);
}

export function useMemberManagementState({
  selectedMemberId,
  selectMember,
}: {
  selectedMemberId: number | null;
  selectMember: (memberId: number) => Promise<boolean>;
}) {
  const { authUser } = useAuthState();
  const queryClient = useQueryClient();
  const [modalState, setModalState] = useState<MembersModalState>({
    kind: "none",
  });
  const [memberForm, setMemberForm] = useState<MemberFormState>(
    createEmptyMemberForm(),
  );
  const [memberFormSubmitting, setMemberFormSubmitting] = useState(false);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);
  const [memberFormMessage, setMemberFormMessage] = useState<string | null>(
    null,
  );
  const useMockMutations = isMockApiMode();
  const canManageMembers = useMemo(
    () => canManageMember(authUser),
    [authUser],
  );

  function clearMemberFeedback() {
    setMemberFormError(null);
    setMemberFormMessage(null);
  }

  function startCreateMember() {
    clearMemberFeedback();
    setMemberForm(createEmptyMemberForm());
    setModalState({ kind: "create" });
  }

  function openMemberDetail(memberId: number) {
    clearMemberFeedback();
    setModalState({ kind: "detail", memberId });
  }

  function openMemberEdit(detail: MemberDetail) {
    clearMemberFeedback();
    setMemberForm(createMemberFormFromDetail(detail));
    setModalState({ kind: "edit", memberId: detail.memberId });
  }

  function openMemberDeactivate(memberId: number) {
    clearMemberFeedback();
    setModalState({ kind: "deactivate", memberId });
  }

  function closeMemberModal() {
    setModalState({ kind: "none" });
    setMemberFormError(null);
    setMemberFormMessage(null);
  }

  async function syncSelectedMember(memberId: number) {
    if (selectedMemberId !== memberId) {
      return;
    }
    await selectMember(memberId);
  }

  async function submitMemberForm() {
    clearMemberFeedback();
    if (!canManageMembers) {
      setMemberFormError("회원 정보를 변경할 권한이 없습니다.");
      return null;
    }

    if (modalState.kind !== "create" && modalState.kind !== "edit") {
      setMemberFormError("회원 입력 모달이 열려 있지 않습니다.");
      return null;
    }

    const parsed =
      modalState.kind === "create"
        ? buildCreateMemberInput(memberForm)
        : buildUpdateMemberInput(memberForm);
    if ("error" in parsed) {
      setMemberFormError(parsed.error ?? "회원 입력값이 올바르지 않습니다.");
      return null;
    }

    setMemberFormSubmitting(true);
    try {
      let nextMember: MemberDetail | null = null;
      if (modalState.kind === "create") {
        if (useMockMutations) {
          const { createMockMember } = await import("../../../api/mockData");
          nextMember = createMockMember(parsed.value);
          setMemberFormMessage(`회원 #${nextMember.memberId}를 등록했습니다.`);
        } else {
          const response = await apiPost<MemberDetail>(
            "/api/v1/members",
            parsed.value,
          );
          nextMember = response.data;
          setMemberFormMessage(response.message);
        }
      } else {
        if (useMockMutations) {
          const { updateMockMember } = await import("../../../api/mockData");
          nextMember = updateMockMember(modalState.memberId, (current) => ({
            ...current,
            ...parsed.value,
          }));
          if (!nextMember) {
            setMemberFormError("수정할 회원을 찾을 수 없습니다.");
            return null;
          }
          setMemberFormMessage(`회원 #${nextMember.memberId} 정보를 수정했습니다.`);
        } else {
          const response = await apiPatch<MemberDetail>(
            `/api/v1/members/${modalState.memberId}`,
            parsed.value,
          );
          nextMember = response.data;
          setMemberFormMessage(response.message);
        }
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      await selectMember(nextMember.memberId);
      setMemberForm(createMemberFormFromDetail(nextMember));
      setModalState({ kind: "detail", memberId: nextMember.memberId });
      return nextMember;
    } finally {
      setMemberFormSubmitting(false);
    }
  }

  async function deactivateMember(memberId: number) {
    clearMemberFeedback();
    if (!canManageMembers) {
      setMemberFormError("회원 상태를 변경할 권한이 없습니다.");
      return null;
    }

    setMemberFormSubmitting(true);
    try {
      let nextMember: MemberDetail | null = null;
      if (useMockMutations) {
        const { updateMockMember } = await import("../../../api/mockData");
        nextMember = updateMockMember(memberId, (current) => ({
          ...current,
          memberStatus: "INACTIVE",
        }));
        if (!nextMember) {
          setMemberFormError("비활성화할 회원을 찾을 수 없습니다.");
          return null;
        }
        setMemberFormMessage(`회원 #${nextMember.memberId}를 비활성화했습니다.`);
      } else {
        const response = await apiPatch<MemberDetail>(
          `/api/v1/members/${memberId}`,
          { memberStatus: "INACTIVE" },
        );
        nextMember = response.data;
        setMemberFormMessage(response.message);
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      await syncSelectedMember(memberId);
      setModalState({ kind: "detail", memberId });
      return nextMember;
    } finally {
      setMemberFormSubmitting(false);
    }
  }

  return {
    modalState,
    memberForm,
    setMemberForm,
    memberFormSubmitting,
    memberFormError,
    memberFormMessage,
    canManageMembers,
    clearMemberFeedback,
    closeMemberModal,
    startCreateMember,
    openMemberDetail,
    openMemberEdit,
    openMemberDeactivate,
    submitMemberForm,
    deactivateMember,
  } as const;
}
