export type MemberSummary = {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
  membershipOperationalStatus: "정상" | "홀딩중" | "만료임박" | "만료" | "없음";
  membershipExpiryDate: string | null;
  remainingPtCount: number | null;
};

export type MemberDetail = {
  memberId: number;
  centerId: number;
  memberName: string;
  phone: string;
  email: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate: string | null;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string | null;
  consentSms: boolean;
  consentMarketing: boolean;
  memo: string | null;
};

export type MembersModalState =
  | { kind: "none" }
  | { kind: "detail"; memberId: number }
  | { kind: "create" }
  | { kind: "edit"; memberId: number }
  | { kind: "deactivate"; memberId: number }
  | { kind: "delete"; memberId: number };

export type MemberFormState = {
  memberName: string;
  phone: string;
  email: string;
  gender: "MALE" | "FEMALE" | "OTHER" | "";
  birthDate: string;
  memberStatus: "ACTIVE" | "INACTIVE";
  joinDate: string;
  consentSms: boolean;
  consentMarketing: boolean;
  memo: string;
};

export type PurchasedMembership = {
  membershipId: number;
  memberId: number;
  productId: number;
  productNameSnapshot: string;
  productCategorySnapshot?: string | null;
  productTypeSnapshot: "DURATION" | "COUNT";
  membershipStatus: "ACTIVE" | "HOLDING" | "REFUNDED" | "EXPIRED";
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
  assignedTrainerId?: number | null;
  activeHoldStatus?: "ACTIVE" | null;
  holdDaysUsed?: number;
  holdCountUsed?: number;
  holdDaysLimit?: number;
  holdCountLimit?: number;
  overrideLimits?: boolean;
};

export type MembershipPaymentRecord = {
  paymentId: number;
  membershipId: number;
  paymentType: "PURCHASE" | "REFUND";
  paymentStatus: "PAID" | "REFUNDED" | "COMPLETED" | "CANCELED" | "FAILED";
  paymentMethod: "CASH" | "CARD" | "TRANSFER" | "ETC";
  amount: number;
  paidAt: string;
  memo: string | null;
};

export type ReservationScheduleSummary = {
  scheduleId: number;
  scheduleType: "PT" | "GX";
  trainerUserId?: number | null;
  trainerName: string;
  slotTitle: string;
  startAt: string;
  endAt: string;
  capacity: number;
  currentCount: number;
};

export type PtReservationCandidate = {
  startAt: string;
  endAt: string;
  source: string;
};

export type PtReservationCandidatesPayload = {
  date: string;
  trainerUserId: number;
  membershipId: number;
  slotDurationMinutes: number;
  slotStepMinutes: number;
  items: PtReservationCandidate[];
};

export type ReservationRow = {
  reservationId: number;
  membershipId: number;
  scheduleId: number;
  reservationStatus: "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reservedAt: string;
  cancelledAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  checkedInAt: string | null;
};

export type MemberQueryFilters = {
  name: string;
  phone: string;
  memberStatus: string;
  membershipOperationalStatus: string;
  dateFrom: string;
  dateTo: string;
  trainerId?: number;
  productId?: number;
};

export function createEmptyMemberForm(): MemberFormState {
  return {
    memberName: "",
    phone: "",
    email: "",
    gender: "",
    birthDate: "",
    memberStatus: "ACTIVE",
    joinDate: "",
    consentSms: false,
    consentMarketing: false,
    memo: "",
  };
}

export function createMemberFormFromDetail(
  detail: MemberDetail,
): MemberFormState {
  return {
    memberName: detail.memberName,
    phone: detail.phone,
    email: detail.email ?? "",
    gender: detail.gender ?? "",
    birthDate: detail.birthDate ?? "",
    memberStatus: detail.memberStatus,
    joinDate: detail.joinDate ?? "",
    consentSms: detail.consentSms,
    consentMarketing: detail.consentMarketing,
    memo: detail.memo ?? "",
  };
}
