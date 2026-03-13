import { useEffect, useState } from "react";

import { apiPost, isMockApiMode } from "../../../api/client";
import { createMockLockerAssignment, returnMockLockerAssignment } from "../../../api/mockData";
import { invalidateQueryDomains } from "../../../api/queryInvalidation";
import { createEmptyLockerAssignForm, type LockerAssignForm, type LockerFilters } from "./types";

export function useLockerPrototypeState(selectedMemberId?: number | null) {
  const [lockerFilters, setLockerFilters] = useState<LockerFilters>({
    lockerStatus: "",
    lockerZone: ""
  });
  const [lockerAssignForm, setLockerAssignForm] = useState<LockerAssignForm>(() => createEmptyLockerAssignForm(selectedMemberId));
  const [lockerAssignSubmitting, setLockerAssignSubmitting] = useState(false);
  const [lockerReturnSubmittingId, setLockerReturnSubmittingId] = useState<number | null>(null);
  const [lockerPanelMessage, setLockerPanelMessage] = useState<string | null>(null);
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

  async function handleLockerAssign() {
    clearLockerFeedback();
    setLockerAssignSubmitting(true);
    try {
      if (!lockerAssignForm.lockerSlotId || !lockerAssignForm.memberId) {
        setLockerPanelError("라커 슬롯과 회원을 모두 선택해야 합니다.");
        return false;
      }

      const result = useMockMutations
        ? createMockLockerAssignment({
            lockerSlotId: Number(lockerAssignForm.lockerSlotId),
            memberId: Number(lockerAssignForm.memberId),
            startDate: lockerAssignForm.startDate,
            endDate: lockerAssignForm.endDate,
            memo: lockerAssignForm.memo.trim() || null
          })
        : await apiPost("/api/v1/lockers/assignments", {
            lockerSlotId: Number(lockerAssignForm.lockerSlotId),
            memberId: Number(lockerAssignForm.memberId),
            startDate: lockerAssignForm.startDate,
            endDate: lockerAssignForm.endDate,
            memo: lockerAssignForm.memo.trim() || null
          });
      invalidateQueryDomains(["lockerSlots", "lockerAssignments"]);
      if ("ok" in result && !result.ok) {
        setLockerPanelError(result.message);
        return false;
      }
      setLockerPanelMessage(result.message);
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
        ? returnMockLockerAssignment(lockerAssignmentId)
        : await apiPost(`/api/v1/lockers/assignments/${lockerAssignmentId}/return`, {});
      invalidateQueryDomains(["lockerSlots", "lockerAssignments"]);
      if ("ok" in result && !result.ok) {
        setLockerPanelError(result.message);
        return false;
      }
      setLockerPanelMessage(result.message);
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
    handleLockerReturn
  } as const;
}
