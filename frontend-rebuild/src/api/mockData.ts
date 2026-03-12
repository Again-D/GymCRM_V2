import type { ApiEnvelope } from "./client";
import type {
  MemberDetail,
  MemberSummary,
  PurchasedMembership,
  ReservationScheduleSummary
} from "../pages/members/modules/types";
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

const mockMemberMemberships = new Map<number, PurchasedMembership[]>([
  [
    101,
    [
      {
        membershipId: 9001,
        memberId: 101,
        productNameSnapshot: "PT 10회권",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-03-01",
        endDate: "2026-06-30",
        remainingCount: 8
      },
      {
        membershipId: 9002,
        memberId: 101,
        productNameSnapshot: "헬스 3개월",
        productTypeSnapshot: "DURATION",
        membershipStatus: "HOLDING",
        startDate: "2026-02-15",
        endDate: "2026-05-15",
        remainingCount: null
      },
      {
        membershipId: 9003,
        memberId: 101,
        productNameSnapshot: "만료된 PT 5회권",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2025-12-01",
        endDate: "2026-01-15",
        remainingCount: 3
      }
    ]
  ],
  [
    102,
    [
      {
        membershipId: 9011,
        memberId: 102,
        productNameSnapshot: "PT 20회권",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-02-01",
        endDate: "2026-07-20",
        remainingCount: 12
      },
      {
        membershipId: 9012,
        memberId: 102,
        productNameSnapshot: "GX 12회권",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-02-20",
        endDate: "2026-04-30",
        remainingCount: 0
      }
    ]
  ],
  [103, []]
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

const mockReservationSchedules: ReservationScheduleSummary[] = [
  {
    scheduleId: 7001,
    scheduleType: "PT",
    trainerName: "정트레이너",
    slotTitle: "오전 PT A",
    startAt: "2026-03-12T09:00:00+09:00",
    endAt: "2026-03-12T09:50:00+09:00",
    capacity: 1,
    currentCount: 1
  },
  {
    scheduleId: 7002,
    scheduleType: "PT",
    trainerName: "김트레이너",
    slotTitle: "오후 PT B",
    startAt: "2026-03-12T15:00:00+09:00",
    endAt: "2026-03-12T15:50:00+09:00",
    capacity: 1,
    currentCount: 0
  },
  {
    scheduleId: 7101,
    scheduleType: "GX",
    trainerName: "한코치",
    slotTitle: "저녁 GX C",
    startAt: "2026-03-12T19:00:00+09:00",
    endAt: "2026-03-12T19:50:00+09:00",
    capacity: 12,
    currentCount: 7
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
    const segments = url.pathname.split("/").filter(Boolean);
    const memberId = Number(segments[3]);
    if (segments[4] === "memberships") {
      return envelope(mockMemberMemberships.get(memberId) ?? []);
    }
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

  if (url.pathname === "/api/v1/reservations/schedules") {
    return envelope(mockReservationSchedules);
  }

  return null;
}
