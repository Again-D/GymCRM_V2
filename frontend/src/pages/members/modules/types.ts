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

export type PurchasedMembership = {
  membershipId: number;
  memberId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  membershipStatus: "ACTIVE" | "HOLDING" | "REFUNDED" | "EXPIRED";
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
  activeHoldStatus?: "ACTIVE" | null;
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
  trainerName: string;
  slotTitle: string;
  startAt: string;
  endAt: string;
  capacity: number;
  currentCount: number;
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
  membershipOperationalStatus: string;
  dateFrom: string;
  dateTo: string;
};
