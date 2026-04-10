export type TrainerSummary = {
  userId: number;
  centerId: number;
  userName: string;
  userStatus: "ACTIVE" | "INACTIVE";
  phone: string | null;
  assignedMemberCount: number;
  todayConfirmedReservationCount: number;
};

export type TrainerAssignedMember = {
  memberId: number;
  memberName: string;
  membershipId: number;
  membershipStatus: string;
};

export type TrainerDetail = TrainerSummary & {
  loginId?: string | null;
  ptSessionUnitPrice: number | null;
  gxSessionUnitPrice: number | null;
  assignedMembers: TrainerAssignedMember[];
};

export type TrainerFilters = {
  centerId: number;
  keyword: string;
  status: "" | "ACTIVE" | "INACTIVE";
};

export type TrainerFormState = {
  centerId: number;
  loginId: string;
  password: string;
  userName: string;
  phone: string;
  ptSessionUnitPrice: string;
  gxSessionUnitPrice: string;
};

export function createDefaultTrainerFilters(centerId = 1): TrainerFilters {
  return {
    centerId,
    keyword: "",
    status: "",
  };
}

export function createEmptyTrainerForm(centerId = 1): TrainerFormState {
  return {
    centerId,
    loginId: "",
    password: "",
    userName: "",
    phone: "",
    ptSessionUnitPrice: "",
    gxSessionUnitPrice: "",
  };
}

export function createTrainerFormFromDetail(detail: TrainerDetail): TrainerFormState {
  return {
    centerId: detail.centerId,
    loginId: detail.loginId ?? "",
    password: "",
    userName: detail.userName,
    phone: detail.phone ?? "",
    ptSessionUnitPrice:
      detail.ptSessionUnitPrice == null ? "" : String(detail.ptSessionUnitPrice),
    gxSessionUnitPrice:
      detail.gxSessionUnitPrice == null ? "" : String(detail.gxSessionUnitPrice),
  };
}
