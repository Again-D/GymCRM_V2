import type { ApiEnvelope } from "./client";
import type { MemberDetail, MemberSummary } from "../pages/members/modules/types";
import type { ReservationTargetSummary } from "../pages/reservations/modules/useReservationTargetsQuery";

const mockMembers: MemberSummary[] = [
  {
    memberId: 101,
    centerId: 1,
    memberName: "김민수",
    phone: "010-1234-5678",
    memberStatus: "ACTIVE",
    joinDate: "2026-01-04",
    membershipOperationalStatus: "홀딩중",
    membershipExpiryDate: "2026-06-30",
    remainingPtCount: 8
  },
  {
    memberId: 102,
    centerId: 1,
    memberName: "박서연",
    phone: "010-9988-7766",
    memberStatus: "ACTIVE",
    joinDate: "2025-11-14",
    membershipOperationalStatus: "정상",
    membershipExpiryDate: "2026-07-20",
    remainingPtCount: 12
  },
  {
    memberId: 103,
    centerId: 1,
    memberName: "이도윤",
    phone: "010-7777-2222",
    memberStatus: "INACTIVE",
    joinDate: "2025-08-11",
    membershipOperationalStatus: "없음",
    membershipExpiryDate: null,
    remainingPtCount: null
  }
];

const mockMemberDetails = new Map<number, MemberDetail>([
  [
    101,
    {
      memberId: 101,
      centerId: 1,
      memberName: "김민수",
      phone: "010-1234-5678",
      email: "minsu@example.com",
      gender: "MALE",
      birthDate: "1994-01-12",
      memberStatus: "ACTIVE",
      joinDate: "2026-01-04",
      consentSms: true,
      consentMarketing: false,
      memo: "홀딩중 회원 example"
    }
  ],
  [
    102,
    {
      memberId: 102,
      centerId: 1,
      memberName: "박서연",
      phone: "010-9988-7766",
      email: "seoyeon@example.com",
      gender: "FEMALE",
      birthDate: "1996-05-08",
      memberStatus: "ACTIVE",
      joinDate: "2025-11-14",
      consentSms: true,
      consentMarketing: true,
      memo: "정상 회원 example"
    }
  ],
  [
    103,
    {
      memberId: 103,
      centerId: 1,
      memberName: "이도윤",
      phone: "010-7777-2222",
      email: null,
      gender: "OTHER",
      birthDate: null,
      memberStatus: "INACTIVE",
      joinDate: "2025-08-11",
      consentSms: false,
      consentMarketing: false,
      memo: null
    }
  ]
]);

const mockReservationTargets: ReservationTargetSummary[] = [
  {
    memberId: 101,
    memberCode: "M-0101",
    memberName: "김민수",
    phone: "010-1234-5678",
    reservableMembershipCount: 1,
    membershipExpiryDate: "2026-06-30",
    confirmedReservationCount: 2
  },
  {
    memberId: 102,
    memberCode: "M-0102",
    memberName: "박서연",
    phone: "010-9988-7766",
    reservableMembershipCount: 2,
    membershipExpiryDate: "2026-07-20",
    confirmedReservationCount: 1
  }
];

function envelope<T>(data: T): ApiEnvelope<T> {
  return {
    success: true,
    data,
    message: "mock ok",
    timestamp: "2026-03-12T00:00:00Z",
    traceId: "mock-trace"
  };
}

function filterMembers(url: URL) {
  const name = url.searchParams.get("name")?.trim() ?? "";
  const phone = url.searchParams.get("phone")?.trim() ?? "";
  const status = url.searchParams.get("membershipOperationalStatus")?.trim() ?? "";

  return mockMembers.filter((member) => {
    const matchesName = !name || member.memberName.includes(name);
    const matchesPhone = !phone || member.phone.includes(phone);
    const matchesStatus = !status || member.membershipOperationalStatus === status;
    return matchesName && matchesPhone && matchesStatus;
  });
}

export function getMockResponse(path: string): ApiEnvelope<unknown> | null {
  const url = new URL(path, "http://local.mock");

  if (url.pathname === "/api/v1/members") {
    return envelope(filterMembers(url));
  }

  if (url.pathname.startsWith("/api/v1/members/")) {
    const memberId = Number(url.pathname.split("/").pop());
    const detail = mockMemberDetails.get(memberId);
    return detail ? envelope(detail) : null;
  }

  if (url.pathname === "/api/v1/reservations/targets") {
    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    const targets = !keyword
      ? mockReservationTargets
      : mockReservationTargets.filter(
          (target) =>
            target.memberName.includes(keyword) ||
            target.phone.includes(keyword) ||
            target.memberCode.includes(keyword)
        );
    return envelope(targets);
  }

  return null;
}
