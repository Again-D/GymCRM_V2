import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys } from "../../../app/queryHelpers";
import {
  createEmptyLockerAssignForm,
  type LockerAssignForm,
  type LockerFilters,
} from "./types";

export function useLockerPrototypeState(selectedMemberId?: number | null) {
  const queryClient = useQueryClient();
  const [lockerFilters, setLockerFilters] = useState<LockerFilters>({
    lockerStatus: "",
    lockerZone: "",
  });
  const [lockerAssignForm, setLockerAssignForm] = useState<LockerAssignForm>(
    () => createEmptyLockerAssignForm(selectedMemberId),
  );
  const [lockerAssignSubmitting, setLockerAssignSubmitting] = useState(false);
  const [lockerReturnSubmittingId, setLockerReturnSubmittingId] = useState<
    number | null
  >(null);
  const [lockerPanelMessage, setLockerPanelMessage] = useState<string | null>(
    null,
  );
  const [lockerPanelError, setLockerPanelError] = useState<string | null>(null);
  const useMockMutations = isMockApiMode();

  useEffect(() => {
    setLockerAssignForm(createEmptyLockerAssignForm(selectedMemberId));
    setLockerPanelMessage(null);
    setLockerPanelError(null);
    setLockerAssignSubmitting(false);
    setLockerReturnSubmittingId(null);
  }, [selectedMemberId]);

  function clearLockerFeedback() {
    setLockerPanelMessage(null);
    setLockerPanelError(null);
  }

  const invalidateLockers = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.lockers.all });
  };

  async function handleLockerAssign() {
    clearLockerFeedback();
    setLockerAssignSubmitting(true);
    try {
      if (!lockerAssignForm.lockerSlotId || !lockerAssignForm.memberId) {
        setLockerPanelError("라커 슬롯과 회원을 모두 선택해야 합니다.");
        return false;
      }

      const result = useMockMutations
        ? await import("../../../api/mockData").then(
            ({ createMockLockerAssignment }) =>
              createMockLockerAssignment({
                lockerSlotId: Number(lockerAssignForm.lockerSlotId),
                memberId: Number(lockerAssignForm.memberId),
                startDate: lockerAssignForm.startDate,
                endDate: lockerAssignForm.endDate,
                memo: lockerAssignForm.memo.trim() || null,
              }),
          )
        : await apiPost("/api/v1/lockers/assignments", {
            lockerSlotId: Number(lockerAssignForm.lockerSlotId),
            memberId: Number(lockerAssignForm.memberId),
            startDate: lockerAssignForm.startDate,
            endDate: lockerAssignForm.endDate,
            memo: lockerAssignForm.memo.trim() || null,
          });

      await invalidateLockers();
      
      if ("ok" in (result as any) && !(result as any).ok) {
        setLockerPanelError((result as any).message);
        return false;
      }
      setLockerPanelMessage((result as any).message || "라커가 성공적으로 배정되었습니다.");
      setLockerAssignForm(createEmptyLockerAssignForm(selectedMemberId));
      return true;
    } finally {
      setLockerAssignSubmitting(false);
    }
  }

  async function handleLockerReturn(lockerAssignmentId: number) {
    clearLockerFeedback();
    setLockerReturnSubmittingId(lockerAssignmentId);
    try {
      const result = useMockMutations
        ? await import("../../../api/mockData").then(
            ({ returnMockLockerAssignment }) =>
              returnMockLockerAssignment(lockerAssignmentId),
          )
        : await apiPost(
            `/api/v1/lockers/assignments/${lockerAssignmentId}/return`,
            {},
          );

      await invalidateLockers();

      if ("ok" in (result as any) && !(result as any).ok) {
        setLockerPanelError((result as any).message);
        return false;
      }
      setLockerPanelMessage((result as any).message || "라커가 반납 처리되었습니다.");
      return true;
    } finally {
      setLockerReturnSubmittingId(null);
    }
  }

  return {
    lockerFilters,
    setLockerFilters,
    lockerAssignForm,
    setLockerAssignForm,
    lockerAssignSubmitting,
    lockerReturnSubmittingId,
    lockerPanelMessage,
    lockerPanelError,
    clearLockerFeedback,
    handleLockerAssign,
    handleLockerReturn,
  } as const;
}
