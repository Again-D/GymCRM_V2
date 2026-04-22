import { todayLocalDate } from "../../../shared/date";

export type LockerStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE";

export type LockerSlot = {
  lockerSlotId: number;
  centerId: number;
  lockerCode: string;
  lockerZone: string | null;
  lockerGrade: string | null;
  lockerStatus: LockerStatus;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LockerAssignmentStatus = "ACTIVE" | "RETURNED";

export type LockerAssignment = {
  lockerAssignmentId: number;
  centerId: number;
  lockerSlotId: number;
  lockerCode: string;
  memberId: number;
  memberName: string;
  assignmentStatus: LockerAssignmentStatus;
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
  lockerStatus: "" | LockerStatus;
  lockerZone: string;
};

export type LockerAssignForm = {
  lockerSlotId: string;
  memberId: string;
  startDate: string;
  endDate: string;
  memo: string;
};

export type LockerCreateRow = {
  lockerZone: string;
  lockerNumber: number | null;
  lockerGrade: string;
  lockerStatus: LockerStatus;
  memo: string;
};

export function createEmptyLockerAssignForm(selectedMemberId?: number | null): LockerAssignForm {
  const today = todayLocalDate();
  return {
    lockerSlotId: "",
    memberId: selectedMemberId ? String(selectedMemberId) : "",
    startDate: today,
    endDate: today,
    memo: ""
  };
}

export function createEmptyLockerCreateRow(): LockerCreateRow {
  return {
    lockerZone: "",
    lockerNumber: null,
    lockerGrade: "STANDARD",
    lockerStatus: "AVAILABLE",
    memo: "",
  };
}

export function buildLockerCode(lockerZone: string, lockerNumber: number | null) {
  const normalizedZone = lockerZone.trim().toUpperCase();
  if (!normalizedZone || lockerNumber == null || Number.isNaN(lockerNumber)) {
    return "";
  }
  const normalizedNumber = lockerNumber < 100 ? String(lockerNumber).padStart(2, "0") : String(lockerNumber);
  return `${normalizedZone}-${normalizedNumber}`;
}
