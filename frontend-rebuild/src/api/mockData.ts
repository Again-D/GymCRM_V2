import type { ApiEnvelope } from "./client";
import type {
  MemberDetail,
  MemberSummary,
  PurchasedMembership,
  ReservationRow,
  ReservationScheduleSummary
} from "../pages/members/modules/types";
import type {
  AccessEventRow,
  AccessPresenceRow,
  AccessPresenceSummary
} from "../pages/access/modules/types";
import type { ReservationTargetSummary } from "../pages/reservations/modules/useReservationTargetsQuery";
import { isMembershipReservableOn } from "../pages/reservations/modules/reservableMemberships";

const initialMembers: MemberSummary[] = [
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

const trainerAssignedMemberIds = new Map<number, number[]>([
  [41, [101]],
  [42, [102]]
]);

const initialMemberDetails = new Map<number, MemberDetail>([
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

const initialMemberMemberships = new Map<number, PurchasedMembership[]>([
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
        remainingCount: 8,
        activeHoldStatus: null
      },
      {
        membershipId: 9002,
        memberId: 101,
        productNameSnapshot: "헬스 3개월",
        productTypeSnapshot: "DURATION",
        membershipStatus: "HOLDING",
        startDate: "2026-02-15",
        endDate: "2026-05-15",
        remainingCount: null,
        activeHoldStatus: "ACTIVE"
      },
      {
        membershipId: 9003,
        memberId: 101,
        productNameSnapshot: "만료된 PT 5회권",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2025-12-01",
        endDate: "2026-01-15",
        remainingCount: 3,
        activeHoldStatus: null
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
        remainingCount: 12,
        activeHoldStatus: null
      },
      {
        membershipId: 9012,
        memberId: 102,
        productNameSnapshot: "GX 12회권",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-02-20",
        endDate: "2026-04-30",
        remainingCount: 0,
        activeHoldStatus: null
      }
    ]
  ],
  [103, []]
]);

const initialReservationSchedules: ReservationScheduleSummary[] = [
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

const initialReservationsByMemberId = new Map<number, ReservationRow[]>([
  [
    101,
    [
      {
        reservationId: 5001,
        membershipId: 9001,
        scheduleId: 7001,
        reservationStatus: "CONFIRMED",
        reservedAt: "2026-03-11T10:00:00+09:00",
        cancelledAt: null,
        completedAt: null,
        noShowAt: null,
        checkedInAt: null
      }
    ]
  ],
  [
    102,
    [
      {
        reservationId: 5002,
        membershipId: 9011,
        scheduleId: 7101,
        reservationStatus: "COMPLETED",
        reservedAt: "2026-03-10T12:00:00+09:00",
        cancelledAt: null,
        completedAt: "2026-03-10T19:55:00+09:00",
        noShowAt: null,
        checkedInAt: "2026-03-10T18:58:00+09:00"
      }
    ]
  ]
]);

const initialOpenAccessSessions: AccessPresenceRow[] = [
  {
    accessSessionId: 3001,
    memberId: 101,
    memberName: "김민수",
    phone: "010-1234-5678",
    membershipId: 9001,
    reservationId: 5001,
    entryAt: "2026-03-12T09:03:00+09:00"
  }
];

const initialAccessEvents: AccessEventRow[] = [
  {
    accessEventId: 8101,
    memberId: 101,
    membershipId: 9001,
    reservationId: 5001,
    eventType: "ENTRY_GRANTED",
    denyReason: null,
    processedAt: "2026-03-12T09:03:00+09:00"
  },
  {
    accessEventId: 8102,
    memberId: 102,
    membershipId: null,
    reservationId: null,
    eventType: "ENTRY_DENIED",
    denyReason: "예약 가능 회원권 없음",
    processedAt: "2026-03-12T08:12:00+09:00"
  }
];

let mockMembers = cloneMembers(initialMembers);
let mockMemberDetails = cloneMemberDetails(initialMemberDetails);
let mockMemberMemberships = cloneMembershipMap(initialMemberMemberships);
let mockReservationSchedules = cloneSchedules(initialReservationSchedules);
let mockReservationsByMemberId = cloneReservationsMap(initialReservationsByMemberId);
let mockOpenAccessSessions = cloneAccessSessions(initialOpenAccessSessions);
let mockAccessEvents = cloneAccessEvents(initialAccessEvents);
let mockDataVersion = 0;
let membershipIdSeed = 99000;
let accessSessionIdSeed = 92000;
let accessEventIdSeed = 97000;

function cloneMembers(source: MemberSummary[]) {
  return source.map((member) => ({ ...member }));
}

function cloneMemberDetails(source: Map<number, MemberDetail>) {
  return new Map(Array.from(source.entries(), ([memberId, detail]) => [memberId, { ...detail }]));
}

function cloneMembershipMap(source: Map<number, PurchasedMembership[]>) {
  return new Map(
    Array.from(source.entries(), ([memberId, memberships]) => [
      memberId,
      memberships.map((membership) => ({ ...membership }))
    ])
  );
}

function cloneSchedules(source: ReservationScheduleSummary[]) {
  return source.map((schedule) => ({ ...schedule }));
}

function cloneReservationsMap(source: Map<number, ReservationRow[]>) {
  return new Map(
    Array.from(source.entries(), ([memberId, reservations]) => [
      memberId,
      reservations.map((reservation) => ({ ...reservation }))
    ])
  );
}

function cloneAccessSessions(source: AccessPresenceRow[]) {
  return source.map((session) => ({ ...session }));
}

function cloneAccessEvents(source: AccessEventRow[]) {
  return source.map((event) => ({ ...event }));
}

function envelope<T>(data: T): ApiEnvelope<T> {
  return {
    success: true,
    data,
    message: "mock ok",
    timestamp: "2026-03-12T00:00:00Z",
    traceId: "mock-trace"
  };
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function getVisibleMemberships(memberId: number) {
  return (mockMemberMemberships.get(memberId) ?? []).filter((membership) => membership.membershipStatus !== "REFUNDED");
}

function deriveMembershipOperationalStatus(memberships: PurchasedMembership[]): MemberSummary["membershipOperationalStatus"] {
  if (memberships.some((membership) => membership.membershipStatus === "HOLDING")) {
    return "홀딩중";
  }

  const activeMemberships = memberships.filter((membership) => membership.membershipStatus === "ACTIVE");
  if (activeMemberships.length === 0) {
    return "없음";
  }

  const today = todayText();
  const futureOrCurrentMemberships = activeMemberships.filter(
    (membership) => !membership.endDate || membership.endDate >= today
  );
  if (futureOrCurrentMemberships.length === 0) {
    return "만료";
  }

  const hasExpiringSoon = futureOrCurrentMemberships.some((membership) => {
    if (!membership.endDate) {
      return false;
    }
    return membership.endDate <= addDays(today, 14);
  });

  return hasExpiringSoon ? "만료임박" : "정상";
}

function addDays(dateText: string, days: number) {
  const next = new Date(`${dateText}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function deriveMembershipExpiryDate(memberships: PurchasedMembership[]) {
  const datedMemberships = memberships.filter((membership) => membership.endDate);
  if (datedMemberships.length === 0) {
    return null;
  }
  return datedMemberships.reduce<string | null>((latest, membership) => {
    if (!membership.endDate) {
      return latest;
    }
    if (!latest || membership.endDate > latest) {
      return membership.endDate;
    }
    return latest;
  }, null);
}

function deriveRemainingPtCount(memberships: PurchasedMembership[]) {
  const total = memberships
    .filter(
      (membership) =>
        membership.membershipStatus === "ACTIVE" &&
        membership.productTypeSnapshot === "COUNT" &&
        membership.productNameSnapshot.includes("PT")
    )
    .reduce((sum, membership) => sum + (membership.remainingCount ?? 0), 0);
  return total > 0 ? total : null;
}

function deriveMembers() {
  return mockMembers.map((member) => {
    const visibleMemberships = getVisibleMemberships(member.memberId);
    return {
      ...member,
      membershipOperationalStatus: deriveMembershipOperationalStatus(visibleMemberships),
      membershipExpiryDate: deriveMembershipExpiryDate(visibleMemberships),
      remainingPtCount: deriveRemainingPtCount(visibleMemberships)
    };
  });
}

function deriveReservationTargets() {
  const businessDateText = todayText();

  return deriveMembers()
    .map((member) => {
      const visibleMemberships = getVisibleMemberships(member.memberId);
      const reservableMemberships = visibleMemberships.filter((membership) =>
        isMembershipReservableOn(membership, businessDateText)
      );
      if (reservableMemberships.length === 0) {
        return null;
      }

      const confirmedReservationCount = (mockReservationsByMemberId.get(member.memberId) ?? []).filter(
        (reservation) => reservation.reservationStatus === "CONFIRMED"
      ).length;

      return {
        memberId: member.memberId,
        memberCode: `M-${String(member.memberId).padStart(4, "0")}`,
        memberName: member.memberName,
        phone: member.phone,
        reservableMembershipCount: reservableMemberships.length,
        membershipExpiryDate: deriveMembershipExpiryDate(reservableMemberships),
        confirmedReservationCount
      } satisfies ReservationTargetSummary;
    })
    .filter((target): target is ReservationTargetSummary => target !== null);
}

function deriveAccessPresenceSummary(): AccessPresenceSummary {
  const today = todayText();
  const todaysEvents = mockAccessEvents.filter((event) => event.processedAt.slice(0, 10) === today);

  return {
    openSessionCount: mockOpenAccessSessions.length,
    todayEntryGrantedCount: todaysEvents.filter((event) => event.eventType === "ENTRY_GRANTED").length,
    todayExitCount: todaysEvents.filter((event) => event.eventType === "EXIT").length,
    todayEntryDeniedCount: todaysEvents.filter((event) => event.eventType === "ENTRY_DENIED").length,
    openSessions: mockOpenAccessSessions.map((session) => ({ ...session }))
  };
}

function filterMembers(url: URL) {
  const name = url.searchParams.get("name")?.trim() ?? "";
  const phone = url.searchParams.get("phone")?.trim() ?? "";
  const status = url.searchParams.get("membershipOperationalStatus")?.trim() ?? "";

  return deriveMembers().filter((member) => {
    const matchesName = !name || member.memberName.includes(name);
    const matchesPhone = !phone || member.phone.includes(phone);
    const matchesStatus = !status || member.membershipOperationalStatus === status;
    return matchesName && matchesPhone && matchesStatus;
  });
}

function bumpMockDataVersion() {
  mockDataVersion += 1;
}

export function getMockDataVersion() {
  return mockDataVersion;
}

export function resetMockData() {
  mockMembers = cloneMembers(initialMembers);
  mockMemberDetails = cloneMemberDetails(initialMemberDetails);
  mockMemberMemberships = cloneMembershipMap(initialMemberMemberships);
  mockReservationSchedules = cloneSchedules(initialReservationSchedules);
  mockReservationsByMemberId = cloneReservationsMap(initialReservationsByMemberId);
  mockOpenAccessSessions = cloneAccessSessions(initialOpenAccessSessions);
  mockAccessEvents = cloneAccessEvents(initialAccessEvents);
  mockDataVersion = 0;
  membershipIdSeed = 99000;
  accessSessionIdSeed = 92000;
  accessEventIdSeed = 97000;
}

export function createMockMembership(input: {
  memberId: number;
  productNameSnapshot: string;
  productTypeSnapshot: "DURATION" | "COUNT";
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
}) {
  membershipIdSeed += 1;
  const membership: PurchasedMembership = {
    membershipId: membershipIdSeed,
    memberId: input.memberId,
    productNameSnapshot: input.productNameSnapshot,
    productTypeSnapshot: input.productTypeSnapshot,
    membershipStatus: "ACTIVE",
    startDate: input.startDate,
    endDate: input.endDate,
    remainingCount: input.remainingCount,
    activeHoldStatus: null
  };

  const existingMemberships = mockMemberMemberships.get(input.memberId) ?? [];
  mockMemberMemberships.set(input.memberId, [membership, ...existingMemberships]);
  bumpMockDataVersion();
  return { ...membership };
}

export function patchMockMembership(
  memberId: number,
  membershipId: number,
  updater: (membership: PurchasedMembership) => PurchasedMembership
) {
  const existingMemberships = mockMemberMemberships.get(memberId) ?? [];
  let nextMembership: PurchasedMembership | null = null;
  const nextMemberships = existingMemberships.map((membership) => {
    if (membership.membershipId !== membershipId) {
      return membership;
    }
    nextMembership = updater({ ...membership });
    return nextMembership;
  });
  mockMemberMemberships.set(memberId, nextMemberships);
  bumpMockDataVersion();
  if (!nextMembership) {
    return null;
  }
  return nextMembership;
}

export function createMockAccessEntry(memberId: number) {
  const member = mockMemberDetails.get(memberId);
  if (!member) {
    return { ok: false as const, message: "회원을 찾을 수 없습니다." };
  }

  const existingSession = mockOpenAccessSessions.find((session) => session.memberId === memberId);
  if (existingSession) {
    return { ok: false as const, message: "이미 입장중인 회원입니다." };
  }

  const reservableMembership = getVisibleMemberships(memberId).find((membership) =>
    isMembershipReservableOn(membership, todayText())
  );
  const activeReservation =
    (mockReservationsByMemberId.get(memberId) ?? []).find((reservation) => reservation.reservationStatus === "CONFIRMED") ??
    null;

  accessEventIdSeed += 1;

  if (!reservableMembership) {
    mockAccessEvents = [
      {
        accessEventId: accessEventIdSeed,
        memberId,
        membershipId: null,
        reservationId: activeReservation?.reservationId ?? null,
        eventType: "ENTRY_DENIED",
        denyReason: "예약 가능 회원권 없음",
        processedAt: new Date().toISOString()
      },
      ...mockAccessEvents
    ];
    return { ok: false as const, message: "예약 가능 회원권이 없어 입장 처리할 수 없습니다." };
  }

  accessSessionIdSeed += 1;
  const nextSession: AccessPresenceRow = {
    accessSessionId: accessSessionIdSeed,
    memberId,
    memberName: member.memberName,
    phone: member.phone,
    membershipId: reservableMembership.membershipId,
    reservationId: activeReservation?.reservationId ?? null,
    entryAt: new Date().toISOString()
  };
  mockOpenAccessSessions = [nextSession, ...mockOpenAccessSessions];
  mockAccessEvents = [
    {
      accessEventId: accessEventIdSeed,
      memberId,
      membershipId: reservableMembership.membershipId,
      reservationId: activeReservation?.reservationId ?? null,
      eventType: "ENTRY_GRANTED",
      denyReason: null,
      processedAt: new Date().toISOString()
    },
    ...mockAccessEvents
  ];

  return { ok: true as const, message: `회원 #${memberId} 입장을 처리했습니다.` };
}

export function createMockAccessExit(memberId: number) {
  const session = mockOpenAccessSessions.find((item) => item.memberId === memberId);
  if (!session) {
    return { ok: false as const, message: "현재 입장중인 세션이 없습니다." };
  }

  accessEventIdSeed += 1;
  mockOpenAccessSessions = mockOpenAccessSessions.filter((item) => item.memberId !== memberId);
  mockAccessEvents = [
    {
      accessEventId: accessEventIdSeed,
      memberId,
      membershipId: session.membershipId,
      reservationId: session.reservationId,
      eventType: "EXIT",
      denyReason: null,
      processedAt: new Date().toISOString()
    },
    ...mockAccessEvents
  ];

  return { ok: true as const, message: `회원 #${memberId} 퇴장을 처리했습니다.` };
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
      return envelope((mockMemberMemberships.get(memberId) ?? []).map((membership) => ({ ...membership })));
    }
    if (segments[4] === "reservations") {
      return envelope((mockReservationsByMemberId.get(memberId) ?? []).map((reservation) => ({ ...reservation })));
    }
    const detail = mockMemberDetails.get(memberId);
    return detail ? envelope({ ...detail }) : null;
  }

  if (url.pathname === "/api/v1/reservations/targets") {
    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    const targets = !keyword
      ? deriveReservationTargets()
      : deriveReservationTargets().filter(
          (target) =>
            target.memberName.includes(keyword) ||
            target.phone.includes(keyword) ||
            target.memberCode.includes(keyword)
        );
    return envelope(targets);
  }

  if (url.pathname === "/api/v1/reservations/schedules") {
    return envelope(mockReservationSchedules.map((schedule) => ({ ...schedule })));
  }

  if (url.pathname === "/api/v1/access/presence") {
    return envelope(deriveAccessPresenceSummary());
  }

  if (url.pathname === "/api/v1/access/events") {
    const memberId = url.searchParams.get("memberId");
    const limit = Number(url.searchParams.get("limit") ?? "100");
    const filteredEvents =
      memberId == null
        ? mockAccessEvents
        : mockAccessEvents.filter((event) => event.memberId === Number(memberId));
    return envelope(filteredEvents.slice(0, limit).map((event) => ({ ...event })));
  }

  return null;
}

export function getTrainerScopedMemberIds(userId: number) {
  return new Set(trainerAssignedMemberIds.get(userId) ?? []);
}
