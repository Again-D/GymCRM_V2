import { useState } from "react";

export type LockerSlot = {
  lockerSlotId: number;
  centerId: number;
  lockerCode: string;
  lockerZone: string | null;
  lockerGrade: string | null;
  lockerStatus: "AVAILABLE" | "ASSIGNED" | "MAINTENANCE";
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LockerAssignment = {
  lockerAssignmentId: number;
  centerId: number;
  lockerSlotId: number;
  memberId: number;
  assignmentStatus: "ACTIVE" | "RETURNED";
  assignedAt: string;
  startDate: string;
  endDate: string;
  returnedAt: string | null;
  refundAmount: number | null;
  returnReason: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LockerFilters = {
  lockerStatus: "" | "AVAILABLE" | "ASSIGNED" | "MAINTENANCE";
  lockerZone: string;
};

export type LockerAssignFormState = {
  lockerSlotId: string;
  memberId: string;
  startDate: string;
  endDate: string;
  memo: string;
};

export function createEmptyLockerAssignForm(): LockerAssignFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    lockerSlotId: "",
    memberId: "",
    startDate: today,
    endDate: today,
    memo: ""
  };
}

export function useLockerWorkspaceState() {
  const [lockerFilters, setLockerFilters] = useState<LockerFilters>({ lockerStatus: "", lockerZone: "" });
  const [lockerAssignForm, setLockerAssignForm] = useState<LockerAssignFormState>(() => createEmptyLockerAssignForm());
  const [lockerAssignSubmitting, setLockerAssignSubmitting] = useState(false);
  const [lockerReturnSubmittingId, setLockerReturnSubmittingId] = useState<number | null>(null);
  const [lockerPanelMessage, setLockerPanelMessage] = useState<string | null>(null);
  const [lockerPanelError, setLockerPanelError] = useState<string | null>(null);

  function resetLockerWorkspace() {
    setLockerFilters({ lockerStatus: "", lockerZone: "" });
    setLockerAssignForm(createEmptyLockerAssignForm());
    setLockerAssignSubmitting(false);
    setLockerReturnSubmittingId(null);
    setLockerPanelMessage(null);
    setLockerPanelError(null);
  }

  return {
    lockerFilters,
    setLockerFilters,
    lockerAssignForm,
    setLockerAssignForm,
    lockerAssignSubmitting,
    setLockerAssignSubmitting,
    lockerReturnSubmittingId,
    setLockerReturnSubmittingId,
    lockerPanelMessage,
    setLockerPanelMessage,
    lockerPanelError,
    setLockerPanelError,
    resetLockerWorkspace
  };
}
