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

export type MemberQueryFilters = {
  name: string;
  phone: string;
  membershipOperationalStatus: string;
  dateFrom: string;
  dateTo: string;
};
