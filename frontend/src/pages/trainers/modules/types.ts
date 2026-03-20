export type TrainerSummary = {
  userId: number;
  centerId: number;
  displayName: string;
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
  displayName: string;
  phone: string;
};

export function createDefaultTrainerFilters(): TrainerFilters {
  return {
    centerId: 1,
    keyword: "",
    status: "",
  };
}

export function createEmptyTrainerForm(): TrainerFormState {
  return {
    centerId: 1,
    loginId: "",
    password: "",
    displayName: "",
    phone: "",
  };
}

export function createTrainerFormFromDetail(detail: TrainerDetail): TrainerFormState {
  return {
    centerId: detail.centerId,
    loginId: detail.loginId ?? "",
    password: "",
    displayName: detail.displayName,
    phone: detail.phone ?? "",
  };
}
