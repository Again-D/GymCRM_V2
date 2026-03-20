import type { ApiEnvelope } from "./client";
import type {
  MemberDetail,
  MemberSummary,
  PurchasedMembership,
  ReservationRow,
  ReservationScheduleSummary,
} from "../pages/members/modules/types";
import type {
  AccessEventRow,
  AccessPresenceRow,
  AccessPresenceSummary,
} from "../pages/access/modules/types";
import type {
  LockerAssignment,
  LockerSlot,
} from "../pages/lockers/modules/types";
import type { ProductRecord } from "../pages/products/modules/types";
import type { CrmHistoryRow, CrmSendStatus } from "../pages/crm/modules/types";
import type {
  SettlementPaymentMethod,
  SettlementReport,
} from "../pages/settlements/modules/types";
import type { ReservationTargetSummary } from "../pages/reservations/modules/useReservationTargetsQuery";
import type {
  TrainerDetail,
  TrainerSummary,
} from "../pages/trainers/modules/types";
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
    remainingPtCount: 8,
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
    remainingPtCount: 12,
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
    remainingPtCount: null,
  },
];

const trainerAssignedMemberIds = new Map<number, number[]>([
  [41, [101]],
  [42, [102]],
]);

type MockTrainerRecord = {
  userId: number;
  centerId: number;
  loginId: string;
  displayName: string;
  phone: string | null;
  userStatus: "ACTIVE" | "INACTIVE";
};

let trainerIdSeed = 42;
let mockTrainers: MockTrainerRecord[] = [
  {
    userId: 41,
    centerId: 1,
    loginId: "trainer-a",
    displayName: "정트레이너",
    phone: "010-1111-2222",
    userStatus: "ACTIVE",
  },
  {
    userId: 42,
    centerId: 1,
    loginId: "trainer-b",
    displayName: "김트레이너",
    phone: "010-3333-4444",
    userStatus: "ACTIVE",
  },
];

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
      memo: "홀딩중 회원 example",
    },
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
      memo: "정상 회원 example",
    },
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
      memo: null,
    },
  ],
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
        activeHoldStatus: null,
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
        activeHoldStatus: "ACTIVE",
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
        activeHoldStatus: null,
      },
    ],
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
        activeHoldStatus: null,
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
        activeHoldStatus: null,
      },
    ],
  ],
  [103, []],
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
    currentCount: 1,
  },
  {
    scheduleId: 7002,
    scheduleType: "PT",
    trainerName: "김트레이너",
    slotTitle: "오후 PT B",
    startAt: "2026-03-12T15:00:00+09:00",
    endAt: "2026-03-12T15:50:00+09:00",
    capacity: 1,
    currentCount: 0,
  },
  {
    scheduleId: 7101,
    scheduleType: "GX",
    trainerName: "한코치",
    slotTitle: "저녁 GX C",
    startAt: "2026-03-12T19:00:00+09:00",
    endAt: "2026-03-12T19:50:00+09:00",
    capacity: 12,
    currentCount: 7,
  },
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
        checkedInAt: null,
      },
    ],
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
        checkedInAt: "2026-03-10T18:58:00+09:00",
      },
    ],
  ],
]);

const initialOpenAccessSessions: AccessPresenceRow[] = [
  {
    accessSessionId: 3001,
    memberId: 101,
    memberName: "김민수",
    phone: "010-1234-5678",
    membershipId: 9001,
    reservationId: 5001,
    entryAt: "2026-03-12T09:03:00+09:00",
  },
];

const initialAccessEvents: AccessEventRow[] = [
  {
    accessEventId: 8101,
    memberId: 101,
    membershipId: 9001,
    reservationId: 5001,
    eventType: "ENTRY_GRANTED",
    denyReason: null,
    processedAt: "2026-03-12T09:03:00+09:00",
  },
  {
    accessEventId: 8102,
    memberId: 102,
    membershipId: null,
    reservationId: null,
    eventType: "ENTRY_DENIED",
    denyReason: "예약 가능 회원권 없음",
    processedAt: "2026-03-12T08:12:00+09:00",
  },
];

const initialLockerSlots: LockerSlot[] = [
  {
    lockerSlotId: 4001,
    centerId: 1,
    lockerCode: "A-01",
    lockerZone: "A",
    lockerGrade: "STANDARD",
    lockerStatus: "ASSIGNED",
    memo: null,
    createdAt: "2026-01-01T09:00:00Z",
    updatedAt: "2026-03-12T09:00:00Z",
  },
  {
    lockerSlotId: 4002,
    centerId: 1,
    lockerCode: "A-02",
    lockerZone: "A",
    lockerGrade: "STANDARD",
    lockerStatus: "AVAILABLE",
    memo: null,
    createdAt: "2026-01-01T09:00:00Z",
    updatedAt: "2026-03-12T09:00:00Z",
  },
  {
    lockerSlotId: 4003,
    centerId: 1,
    lockerCode: "B-01",
    lockerZone: "B",
    lockerGrade: "PREMIUM",
    lockerStatus: "MAINTENANCE",
    memo: "도어 점검 중",
    createdAt: "2026-01-01T09:00:00Z",
    updatedAt: "2026-03-12T09:00:00Z",
  },
];

const initialLockerAssignments: LockerAssignment[] = [
  {
    lockerAssignmentId: 6001,
    centerId: 1,
    lockerSlotId: 4001,
    lockerCode: "A-01",
    memberId: 101,
    memberName: "김민수",
    assignmentStatus: "ACTIVE",
    assignedAt: "2026-03-01T10:00:00Z",
    startDate: "2026-03-01",
    endDate: "2026-04-01",
    returnedAt: null,
    refundAmount: null,
    returnReason: null,
    memo: "한 달 계약",
    createdAt: "2026-03-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
];

const initialProducts: ProductRecord[] = [
  {
    productId: 1,
    centerId: 1,
    productName: "헬스 90일권",
    productCategory: "MEMBERSHIP",
    productType: "DURATION",
    priceAmount: 180000,
    validityDays: 90,
    totalCount: null,
    allowHold: true,
    maxHoldDays: 30,
    maxHoldCount: 1,
    allowTransfer: false,
    productStatus: "ACTIVE",
    description: "기본 헬스 이용권",
  },
  {
    productId: 2,
    centerId: 1,
    productName: "PT 10회권",
    productCategory: "PT",
    productType: "COUNT",
    priceAmount: 550000,
    validityDays: null,
    totalCount: 10,
    allowHold: false,
    maxHoldDays: null,
    maxHoldCount: null,
    allowTransfer: false,
    productStatus: "ACTIVE",
    description: "퍼스널 트레이닝 10회",
  },
  {
    productId: 3,
    centerId: 1,
    productName: "GX 12회권",
    productCategory: "GX",
    productType: "COUNT",
    priceAmount: 220000,
    validityDays: null,
    totalCount: 12,
    allowHold: false,
    maxHoldDays: null,
    maxHoldCount: null,
    allowTransfer: false,
    productStatus: "INACTIVE",
    description: "그룹 수업 12회",
  },
];

const initialCrmHistoryRows: CrmHistoryRow[] = [
  {
    crmMessageEventId: 12001,
    memberId: 101,
    membershipId: 9001,
    eventType: "MEMBERSHIP_EXPIRY_REMINDER",
    channelType: "SMS",
    sendStatus: "PENDING",
    attemptCount: 0,
    lastAttemptedAt: null,
    nextAttemptAt: "2026-03-13T10:00:00+09:00",
    sentAt: null,
    failedAt: null,
    lastErrorMessage: null,
    traceId: "crm-trace-12001",
    createdAt: "2026-03-13T09:00:00+09:00",
  },
  {
    crmMessageEventId: 12002,
    memberId: 102,
    membershipId: 9011,
    eventType: "MEMBERSHIP_EXPIRY_REMINDER",
    channelType: "SMS",
    sendStatus: "SENT",
    attemptCount: 1,
    lastAttemptedAt: "2026-03-12T11:00:00+09:00",
    nextAttemptAt: null,
    sentAt: "2026-03-12T11:00:03+09:00",
    failedAt: null,
    lastErrorMessage: null,
    traceId: "crm-trace-12002",
    createdAt: "2026-03-12T10:55:00+09:00",
  },
  {
    crmMessageEventId: 12003,
    memberId: 101,
    membershipId: 9002,
    eventType: "MEMBERSHIP_HOLD_NOTICE",
    channelType: "SMS",
    sendStatus: "RETRY_WAIT",
    attemptCount: 2,
    lastAttemptedAt: "2026-03-12T12:15:00+09:00",
    nextAttemptAt: "2026-03-13T12:15:00+09:00",
    sentAt: null,
    failedAt: null,
    lastErrorMessage: "통신사 응답 지연",
    traceId: "crm-trace-12003",
    createdAt: "2026-03-12T12:00:00+09:00",
  },
];

type SettlementTransaction = {
  transactionId: number;
  transactionDate: string;
  productId: number;
  paymentMethod: Exclude<SettlementPaymentMethod, "">;
  grossSales: number;
  refundAmount: number;
};

const initialSettlementTransactions: SettlementTransaction[] = [
  {
    transactionId: 21001,
    transactionDate: "2026-03-01",
    productId: 1,
    paymentMethod: "CARD",
    grossSales: 180000,
    refundAmount: 0,
  },
  {
    transactionId: 21002,
    transactionDate: "2026-03-03",
    productId: 2,
    paymentMethod: "CARD",
    grossSales: 550000,
    refundAmount: 0,
  },
  {
    transactionId: 21003,
    transactionDate: "2026-03-05",
    productId: 2,
    paymentMethod: "TRANSFER",
    grossSales: 550000,
    refundAmount: 110000,
  },
  {
    transactionId: 21004,
    transactionDate: "2026-03-08",
    productId: 1,
    paymentMethod: "CASH",
    grossSales: 180000,
    refundAmount: 0,
  },
  {
    transactionId: 21005,
    transactionDate: "2026-03-11",
    productId: 3,
    paymentMethod: "ETC",
    grossSales: 220000,
    refundAmount: 220000,
  },
  {
    transactionId: 21006,
    transactionDate: "2026-03-12",
    productId: 2,
    paymentMethod: "CARD",
    grossSales: 550000,
    refundAmount: 0,
  },
];

let mockMembers = cloneMembers(initialMembers);
let mockMemberDetails = cloneMemberDetails(initialMemberDetails);
let mockMemberMemberships = cloneMembershipMap(initialMemberMemberships);
let mockReservationSchedules = cloneSchedules(initialReservationSchedules);
let mockReservationsByMemberId = cloneReservationsMap(
  initialReservationsByMemberId,
);
let mockOpenAccessSessions = cloneAccessSessions(initialOpenAccessSessions);
let mockAccessEvents = cloneAccessEvents(initialAccessEvents);
let mockLockerSlots = cloneLockerSlots(initialLockerSlots);
let mockLockerAssignments = cloneLockerAssignments(initialLockerAssignments);
let mockProducts = cloneProducts(initialProducts);
let mockCrmHistoryRows = cloneCrmHistoryRows(initialCrmHistoryRows);
let mockSettlementTransactions = initialSettlementTransactions.map(
  (transaction) => ({ ...transaction }),
);
let mockDataVersion = 0;
let membershipIdSeed = 99000;
let reservationIdSeed = 5002;
let accessSessionIdSeed = 92000;
let accessEventIdSeed = 97000;
let lockerAssignmentIdSeed = 98000;
let productIdSeed = 200;
let crmMessageEventIdSeed = 12050;
let memberIdSeed = 103;

function cloneMembers(source: MemberSummary[]) {
  return source.map((member) => ({ ...member }));
}

function cloneMemberDetails(source: Map<number, MemberDetail>) {
  return new Map(
    Array.from(source.entries(), ([memberId, detail]) => [
      memberId,
      { ...detail },
    ]),
  );
}

function cloneMembershipMap(source: Map<number, PurchasedMembership[]>) {
  return new Map(
    Array.from(source.entries(), ([memberId, memberships]) => [
      memberId,
      memberships.map((membership) => ({ ...membership })),
    ]),
  );
}

function cloneSchedules(source: ReservationScheduleSummary[]) {
  return source.map((schedule) => ({ ...schedule }));
}

function cloneReservationsMap(source: Map<number, ReservationRow[]>) {
  return new Map(
    Array.from(source.entries(), ([memberId, reservations]) => [
      memberId,
      reservations.map((reservation) => ({ ...reservation })),
    ]),
  );
}

function cloneAccessSessions(source: AccessPresenceRow[]) {
  return source.map((session) => ({ ...session }));
}

function cloneAccessEvents(source: AccessEventRow[]) {
  return source.map((event) => ({ ...event }));
}

function cloneLockerSlots(source: LockerSlot[]) {
  return source.map((slot) => ({ ...slot }));
}

function cloneLockerAssignments(source: LockerAssignment[]) {
  return source.map((assignment) => ({ ...assignment }));
}

function cloneProducts(source: ProductRecord[]) {
  return source.map((product) => ({ ...product }));
}

function cloneCrmHistoryRows(source: CrmHistoryRow[]) {
  return source.map((row) => ({ ...row }));
}

function cloneSettlementTransactions(source: SettlementTransaction[]) {
  return source.map((transaction) => ({ ...transaction }));
}

function envelope<T>(data: T): ApiEnvelope<T> {
  return {
    success: true,
    data,
    message: "mock ok",
    timestamp: "2026-03-12T00:00:00Z",
    traceId: "mock-trace",
  };
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function getVisibleMemberships(memberId: number) {
  return (mockMemberMemberships.get(memberId) ?? []).filter(
    (membership) => membership.membershipStatus !== "REFUNDED",
  );
}

function deriveMembershipOperationalStatus(
  memberships: PurchasedMembership[],
): MemberSummary["membershipOperationalStatus"] {
  if (
    memberships.some((membership) => membership.membershipStatus === "HOLDING")
  ) {
    return "홀딩중";
  }

  const activeMemberships = memberships.filter(
    (membership) => membership.membershipStatus === "ACTIVE",
  );
  if (activeMemberships.length === 0) {
    return "없음";
  }

  const today = todayText();
  const futureOrCurrentMemberships = activeMemberships.filter(
    (membership) => !membership.endDate || membership.endDate >= today,
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
  const datedMemberships = memberships.filter(
    (membership) => membership.endDate,
  );
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
        membership.productNameSnapshot.includes("PT"),
    )
    .reduce((sum, membership) => sum + (membership.remainingCount ?? 0), 0);
  return total > 0 ? total : null;
}

function deriveMembers() {
  return mockMembers.map((member) => {
    const visibleMemberships = getVisibleMemberships(member.memberId);
    return {
      ...member,
      membershipOperationalStatus:
        deriveMembershipOperationalStatus(visibleMemberships),
      membershipExpiryDate: deriveMembershipExpiryDate(visibleMemberships),
      remainingPtCount: deriveRemainingPtCount(visibleMemberships),
    };
  });
}

function deriveReservationTargets() {
  const businessDateText = todayText();

  return deriveMembers()
    .map((member) => {
      const visibleMemberships = getVisibleMemberships(member.memberId);
      const reservableMemberships = visibleMemberships.filter((membership) =>
        isMembershipReservableOn(membership, businessDateText),
      );
      if (reservableMemberships.length === 0) {
        return null;
      }

      const confirmedReservationCount = (
        mockReservationsByMemberId.get(member.memberId) ?? []
      ).filter(
        (reservation) => reservation.reservationStatus === "CONFIRMED",
      ).length;

      return {
        memberId: member.memberId,
        memberCode: `M-${String(member.memberId).padStart(4, "0")}`,
        memberName: member.memberName,
        phone: member.phone,
        reservableMembershipCount: reservableMemberships.length,
        membershipExpiryDate: deriveMembershipExpiryDate(reservableMemberships),
        confirmedReservationCount,
      } satisfies ReservationTargetSummary;
    })
    .filter((target): target is ReservationTargetSummary => target !== null);
}

function deriveAccessPresenceSummary(): AccessPresenceSummary {
  const today = todayText();
  const todaysEvents = mockAccessEvents.filter(
    (event) => event.processedAt.slice(0, 10) === today,
  );

  return {
    openSessionCount: mockOpenAccessSessions.length,
    todayEntryGrantedCount: todaysEvents.filter(
      (event) => event.eventType === "ENTRY_GRANTED",
    ).length,
    todayExitCount: todaysEvents.filter((event) => event.eventType === "EXIT")
      .length,
    todayEntryDeniedCount: todaysEvents.filter(
      (event) => event.eventType === "ENTRY_DENIED",
    ).length,
    openSessions: mockOpenAccessSessions.map((session) => ({ ...session })),
  };
}

function filterLockerSlots(url: URL) {
  const lockerStatus = url.searchParams.get("lockerStatus")?.trim() ?? "";
  const lockerZone = url.searchParams.get("lockerZone")?.trim() ?? "";

  return mockLockerSlots.filter((slot) => {
    const matchesStatus = !lockerStatus || slot.lockerStatus === lockerStatus;
    const matchesZone =
      !lockerZone || (slot.lockerZone ?? "").includes(lockerZone);
    return matchesStatus && matchesZone;
  });
}

function filterLockerAssignments(url: URL) {
  const activeOnly = url.searchParams.get("activeOnly") === "true";
  return mockLockerAssignments.filter((assignment) => {
    if (!activeOnly) {
      return true;
    }
    return assignment.assignmentStatus === "ACTIVE";
  });
}

function filterProducts(url: URL) {
  const category = url.searchParams.get("category")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";

  return mockProducts.filter((product) => {
    const matchesCategory = !category || product.productCategory === category;
    const matchesStatus = !status || product.productStatus === status;
    return matchesCategory && matchesStatus;
  });
}

function filterCrmHistory(url: URL) {
  const sendStatus = url.searchParams.get("sendStatus")?.trim() as
    | CrmSendStatus
    | ""
    | null;
  const parsedLimit = Number.parseInt(
    url.searchParams.get("limit") ?? "100",
    10,
  );
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 100;

  return mockCrmHistoryRows
    .filter((row) => !sendStatus || row.sendStatus === sendStatus)
    .slice(0, limit)
    .map((row) => ({ ...row }));
}

function filterSettlementReport(url: URL): SettlementReport {
  const startDate = url.searchParams.get("startDate")?.trim() ?? todayText();
  const endDate = url.searchParams.get("endDate")?.trim() ?? todayText();
  const paymentMethod = (url.searchParams.get("paymentMethod")?.trim() ??
    "") as SettlementPaymentMethod;
  const productKeyword = url.searchParams.get("productKeyword")?.trim() ?? "";

  const groupedRows = new Map<
    string,
    {
      productName: string;
      paymentMethod: Exclude<SettlementPaymentMethod, "">;
      grossSales: number;
      refundAmount: number;
      netSales: number;
      transactionCount: number;
    }
  >();

  for (const transaction of mockSettlementTransactions) {
    if (
      transaction.transactionDate < startDate ||
      transaction.transactionDate > endDate
    ) {
      continue;
    }
    if (paymentMethod && transaction.paymentMethod !== paymentMethod) {
      continue;
    }
    const product = mockProducts.find(
      (item) => item.productId === transaction.productId,
    );
    const productName =
      product?.productName ?? `상품 #${transaction.productId}`;
    if (productKeyword && !productName.includes(productKeyword)) {
      continue;
    }

    const key = `${productName}:${transaction.paymentMethod}`;
    const current = groupedRows.get(key) ?? {
      productName,
      paymentMethod: transaction.paymentMethod,
      grossSales: 0,
      refundAmount: 0,
      netSales: 0,
      transactionCount: 0,
    };
    current.grossSales += transaction.grossSales;
    current.refundAmount += transaction.refundAmount;
    current.netSales += transaction.grossSales - transaction.refundAmount;
    current.transactionCount += 1;
    groupedRows.set(key, current);
  }

  const rows = Array.from(groupedRows.values()).sort((left, right) => {
    if (right.netSales !== left.netSales) {
      return right.netSales - left.netSales;
    }
    return left.productName.localeCompare(right.productName, "ko");
  });

  return {
    startDate,
    endDate,
    paymentMethod: paymentMethod || null,
    productKeyword: productKeyword || null,
    totalGrossSales: rows.reduce((sum, row) => sum + row.grossSales, 0),
    totalRefundAmount: rows.reduce((sum, row) => sum + row.refundAmount, 0),
    totalNetSales: rows.reduce((sum, row) => sum + row.netSales, 0),
    rows,
  };
}

function filterMembers(url: URL) {
  const name = url.searchParams.get("name")?.trim() ?? "";
  const phone = url.searchParams.get("phone")?.trim() ?? "";
  const memberStatus = url.searchParams.get("memberStatus")?.trim() ?? "";
  const status =
    url.searchParams.get("membershipOperationalStatus")?.trim() ?? "";

  return deriveMembers().filter((member) => {
    const matchesName = !name || member.memberName.includes(name);
    const matchesPhone = !phone || member.phone.includes(phone);
    const matchesMemberStatus =
      !memberStatus || member.memberStatus === memberStatus;
    const matchesStatus =
      !status || member.membershipOperationalStatus === status;
    return matchesName && matchesPhone && matchesMemberStatus && matchesStatus;
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
  mockReservationsByMemberId = cloneReservationsMap(
    initialReservationsByMemberId,
  );
  mockOpenAccessSessions = cloneAccessSessions(initialOpenAccessSessions);
  mockAccessEvents = cloneAccessEvents(initialAccessEvents);
  mockLockerSlots = cloneLockerSlots(initialLockerSlots);
  mockLockerAssignments = cloneLockerAssignments(initialLockerAssignments);
  mockProducts = cloneProducts(initialProducts);
  mockCrmHistoryRows = cloneCrmHistoryRows(initialCrmHistoryRows);
  mockSettlementTransactions = cloneSettlementTransactions(
    initialSettlementTransactions,
  );
  mockDataVersion = 0;
  membershipIdSeed = 99000;
  reservationIdSeed = 5002;
  accessSessionIdSeed = 92000;
  accessEventIdSeed = 97000;
  lockerAssignmentIdSeed = 98000;
  productIdSeed = 200;
  crmMessageEventIdSeed = 12050;
  memberIdSeed = 103;
}

export function createMockMember(input: {
  memberName: string;
  phone: string;
  email?: string | null;
  gender?: MemberDetail["gender"];
  birthDate?: string | null;
  memberStatus: MemberDetail["memberStatus"];
  joinDate?: string | null;
  consentSms?: boolean | null;
  consentMarketing?: boolean | null;
  memo?: string | null;
}) {
  memberIdSeed += 1;
  const nextDetail: MemberDetail = {
    memberId: memberIdSeed,
    centerId: 1,
    memberName: input.memberName,
    phone: input.phone,
    email: input.email ?? null,
    gender: input.gender ?? null,
    birthDate: input.birthDate ?? null,
    memberStatus: input.memberStatus,
    joinDate: input.joinDate ?? todayText(),
    consentSms: input.consentSms ?? false,
    consentMarketing: input.consentMarketing ?? false,
    memo: input.memo ?? null,
  };

  mockMemberDetails.set(nextDetail.memberId, { ...nextDetail });
  mockMembers = [
    {
      memberId: nextDetail.memberId,
      centerId: nextDetail.centerId,
      memberName: nextDetail.memberName,
      phone: nextDetail.phone,
      memberStatus: nextDetail.memberStatus,
      joinDate: nextDetail.joinDate,
      membershipOperationalStatus: "없음",
      membershipExpiryDate: null,
      remainingPtCount: null,
    },
    ...mockMembers,
  ];
  mockMemberMemberships.set(nextDetail.memberId, []);
  mockReservationsByMemberId.set(nextDetail.memberId, []);
  bumpMockDataVersion();
  return { ...nextDetail };
}

export function updateMockMember(
  memberId: number,
  updater: (member: MemberDetail) => MemberDetail,
) {
  const existingMember = mockMemberDetails.get(memberId);
  if (!existingMember) {
    return null;
  }

  const nextMember = updater({ ...existingMember });
  mockMemberDetails.set(memberId, { ...nextMember });
  mockMembers = mockMembers.map((member) =>
    member.memberId === memberId
      ? {
          ...member,
          memberName: nextMember.memberName,
          phone: nextMember.phone,
          memberStatus: nextMember.memberStatus,
          joinDate: nextMember.joinDate,
        }
      : member,
  );
  bumpMockDataVersion();
  return { ...nextMember };
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
    activeHoldStatus: null,
  };

  const existingMemberships = mockMemberMemberships.get(input.memberId) ?? [];
  mockMemberMemberships.set(input.memberId, [
    membership,
    ...existingMemberships,
  ]);
  bumpMockDataVersion();
  return { ...membership };
}

export function patchMockMembership(
  memberId: number,
  membershipId: number,
  updater: (membership: PurchasedMembership) => PurchasedMembership,
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

export function createMockReservation(input: {
  memberId: number;
  membershipId: number;
  scheduleId: number;
  memo?: string | null;
}) {
  const reservations = mockReservationsByMemberId.get(input.memberId) ?? [];
  reservationIdSeed += 1;
  const reservation: ReservationRow = {
    reservationId: reservationIdSeed,
    membershipId: input.membershipId,
    scheduleId: input.scheduleId,
    reservationStatus: "CONFIRMED",
    reservedAt: new Date().toISOString(),
    cancelledAt: null,
    completedAt: null,
    noShowAt: null,
    checkedInAt: null,
  };
  mockReservationsByMemberId.set(input.memberId, [
    reservation,
    ...reservations,
  ]);
  bumpMockDataVersion();
  return { ...reservation };
}

export function patchMockReservation(
  memberId: number,
  reservationId: number,
  updater: (reservation: ReservationRow) => ReservationRow,
) {
  const reservations = mockReservationsByMemberId.get(memberId) ?? [];
  let nextReservation: ReservationRow | null = null;
  const nextReservations = reservations.map((reservation) => {
    if (reservation.reservationId !== reservationId) {
      return reservation;
    }
    nextReservation = updater({ ...reservation });
    return nextReservation;
  });
  mockReservationsByMemberId.set(memberId, nextReservations);
  bumpMockDataVersion();
  return nextReservation ? { ...(nextReservation as ReservationRow) } : null;
}

export function createMockAccessEntry(memberId: number) {
  const member = mockMemberDetails.get(memberId);
  if (!member) {
    return { ok: false as const, message: "회원을 찾을 수 없습니다." };
  }

  const existingSession = mockOpenAccessSessions.find(
    (session) => session.memberId === memberId,
  );
  if (existingSession) {
    return { ok: false as const, message: "이미 입장중인 회원입니다." };
  }

  const reservableMembership = getVisibleMemberships(memberId).find(
    (membership) => isMembershipReservableOn(membership, todayText()),
  );
  const activeReservation =
    (mockReservationsByMemberId.get(memberId) ?? []).find(
      (reservation) => reservation.reservationStatus === "CONFIRMED",
    ) ?? null;

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
        processedAt: new Date().toISOString(),
      },
      ...mockAccessEvents,
    ];
    return {
      ok: false as const,
      message: "예약 가능 회원권이 없어 입장 처리할 수 없습니다.",
    };
  }

  accessSessionIdSeed += 1;
  const nextSession: AccessPresenceRow = {
    accessSessionId: accessSessionIdSeed,
    memberId,
    memberName: member.memberName,
    phone: member.phone,
    membershipId: reservableMembership.membershipId,
    reservationId: activeReservation?.reservationId ?? null,
    entryAt: new Date().toISOString(),
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
      processedAt: new Date().toISOString(),
    },
    ...mockAccessEvents,
  ];

  return {
    ok: true as const,
    message: `회원 #${memberId} 입장을 처리했습니다.`,
  };
}

export function createMockAccessExit(memberId: number) {
  const session = mockOpenAccessSessions.find(
    (item) => item.memberId === memberId,
  );
  if (!session) {
    return { ok: false as const, message: "현재 입장중인 세션이 없습니다." };
  }

  accessEventIdSeed += 1;
  mockOpenAccessSessions = mockOpenAccessSessions.filter(
    (item) => item.memberId !== memberId,
  );
  mockAccessEvents = [
    {
      accessEventId: accessEventIdSeed,
      memberId,
      membershipId: session.membershipId,
      reservationId: session.reservationId,
      eventType: "EXIT",
      denyReason: null,
      processedAt: new Date().toISOString(),
    },
    ...mockAccessEvents,
  ];

  return {
    ok: true as const,
    message: `회원 #${memberId} 퇴장을 처리했습니다.`,
  };
}

export function createMockLockerAssignment(input: {
  lockerSlotId: number;
  memberId: number;
  startDate: string;
  endDate: string;
  memo: string | null;
}) {
  const slot = mockLockerSlots.find(
    (item) => item.lockerSlotId === input.lockerSlotId,
  );
  if (!slot) {
    return { ok: false as const, message: "라커 슬롯을 찾을 수 없습니다." };
  }
  if (slot.lockerStatus !== "AVAILABLE") {
    return { ok: false as const, message: "배정 가능한 라커 슬롯이 아닙니다." };
  }
  const member = mockMemberDetails.get(input.memberId);
  if (!member) {
    return { ok: false as const, message: "회원을 찾을 수 없습니다." };
  }

  lockerAssignmentIdSeed += 1;
  const now = new Date().toISOString();
  const nextAssignment: LockerAssignment = {
    lockerAssignmentId: lockerAssignmentIdSeed,
    centerId: 1,
    lockerSlotId: slot.lockerSlotId,
    lockerCode: slot.lockerCode,
    memberId: input.memberId,
    memberName: member.memberName,
    assignmentStatus: "ACTIVE",
    assignedAt: now,
    startDate: input.startDate,
    endDate: input.endDate,
    returnedAt: null,
    refundAmount: null,
    returnReason: null,
    memo: input.memo,
    createdAt: now,
    updatedAt: now,
  };

  mockLockerAssignments = [nextAssignment, ...mockLockerAssignments];
  mockLockerSlots = mockLockerSlots.map((currentSlot) =>
    currentSlot.lockerSlotId === slot.lockerSlotId
      ? { ...currentSlot, lockerStatus: "ASSIGNED", updatedAt: now }
      : currentSlot,
  );

  return {
    ok: true as const,
    message: `라커 ${slot.lockerCode}를 회원 #${input.memberId}에 배정했습니다.`,
  };
}

export function returnMockLockerAssignment(lockerAssignmentId: number) {
  const assignment = mockLockerAssignments.find(
    (item) => item.lockerAssignmentId === lockerAssignmentId,
  );
  if (!assignment || assignment.assignmentStatus !== "ACTIVE") {
    return {
      ok: false as const,
      message: "활성 라커 배정을 찾을 수 없습니다.",
    };
  }

  const now = new Date().toISOString();
  mockLockerAssignments = mockLockerAssignments.map((currentAssignment) =>
    currentAssignment.lockerAssignmentId === lockerAssignmentId
      ? {
          ...currentAssignment,
          assignmentStatus: "RETURNED",
          returnedAt: now,
          updatedAt: now,
        }
      : currentAssignment,
  );
  mockLockerSlots = mockLockerSlots.map((slot) =>
    slot.lockerSlotId === assignment.lockerSlotId
      ? { ...slot, lockerStatus: "AVAILABLE", updatedAt: now }
      : slot,
  );

  return {
    ok: true as const,
    message: `라커 ${assignment.lockerCode} 반납을 처리했습니다.`,
  };
}

export function createMockProduct(
  input: Omit<ProductRecord, "productId" | "centerId">,
) {
  productIdSeed += 1;
  const nextProduct: ProductRecord = {
    productId: productIdSeed,
    centerId: 1,
    ...input,
  };
  mockProducts = [nextProduct, ...mockProducts];
  bumpMockDataVersion();
  return { ...nextProduct };
}

export function updateMockProduct(
  productId: number,
  updater: (product: ProductRecord) => ProductRecord,
) {
  let nextProduct: ProductRecord | null = null;
  mockProducts = mockProducts.map((product) => {
    if (product.productId !== productId) {
      return product;
    }
    nextProduct = updater({ ...product });
    return nextProduct;
  });
  if (!nextProduct) {
    return null;
  }
  bumpMockDataVersion();
  return { ...(nextProduct as ProductRecord) };
}

export function toggleMockProductStatus(productId: number) {
  return updateMockProduct(productId, (product) => ({
    ...product,
    productStatus: product.productStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE",
  }));
}

export function triggerMockCrmExpiryReminder(daysAhead: number) {
  crmMessageEventIdSeed += 1;
  const now = new Date().toISOString();
  const targetMembership = (mockMemberMemberships.get(102) ?? [])[0];
  const nextRow: CrmHistoryRow = {
    crmMessageEventId: crmMessageEventIdSeed,
    memberId: 102,
    membershipId: targetMembership?.membershipId ?? null,
    eventType: "MEMBERSHIP_EXPIRY_REMINDER",
    channelType: "SMS",
    sendStatus: "PENDING",
    attemptCount: 0,
    lastAttemptedAt: null,
    nextAttemptAt: now,
    sentAt: null,
    failedAt: null,
    lastErrorMessage: null,
    traceId: `crm-trace-${crmMessageEventIdSeed}`,
    createdAt: now,
  };

  mockCrmHistoryRows = [nextRow, ...mockCrmHistoryRows];
  bumpMockDataVersion();

  return {
    ok: true as const,
    message: `${daysAhead}일 기준 만료임박 메시지 ${1}건을 큐에 적재했습니다.`,
    createdCount: 1,
  };
}

export function processMockCrmQueue() {
  const now = new Date().toISOString();
  let processedCount = 0;

  mockCrmHistoryRows = mockCrmHistoryRows.map((row) => {
    if (row.sendStatus === "PENDING" && processedCount < 1) {
      processedCount += 1;
      return {
        ...row,
        sendStatus: "SENT",
        attemptCount: row.attemptCount + 1,
        lastAttemptedAt: now,
        sentAt: now,
        nextAttemptAt: null,
        lastErrorMessage: null,
      };
    }

    if (row.sendStatus === "RETRY_WAIT" && processedCount < 2) {
      processedCount += 1;
      return {
        ...row,
        sendStatus: "SENT",
        attemptCount: row.attemptCount + 1,
        lastAttemptedAt: now,
        sentAt: now,
        nextAttemptAt: null,
        lastErrorMessage: null,
      };
    }

    return row;
  });

  bumpMockDataVersion();

  return {
    ok: true as const,
    message: `CRM 큐 ${processedCount}건을 처리했습니다.`,
    processedCount,
  };
}

function buildMockTrainerSummary(trainer: MockTrainerRecord): TrainerSummary {
  const assignedMemberIds = trainerAssignedMemberIds.get(trainer.userId) ?? [];
  const todayConfirmedReservationCount = assignedMemberIds.reduce((count, memberId) => {
    const reservations = mockReservationsByMemberId.get(memberId) ?? [];
    return (
      count +
      reservations.filter(
        (reservation) => reservation.reservationStatus === "CONFIRMED",
      ).length
    );
  }, 0);

  return {
    userId: trainer.userId,
    centerId: trainer.centerId,
    displayName: trainer.displayName,
    userStatus: trainer.userStatus,
    phone: trainer.phone,
    assignedMemberCount: new Set(assignedMemberIds).size,
    todayConfirmedReservationCount,
  };
}

function buildMockTrainerDetail(trainer: MockTrainerRecord): TrainerDetail {
  const summary = buildMockTrainerSummary(trainer);
  const assignedMembers = (trainerAssignedMemberIds.get(trainer.userId) ?? [])
    .map((memberId) => {
      const member = initialMemberDetails.get(memberId);
      const membership = (mockMemberMemberships.get(memberId) ?? []).find(
        (item) =>
          item.membershipStatus === "ACTIVE" || item.membershipStatus === "HOLDING",
      );
      if (!member || !membership) {
        return null;
      }
      return {
        memberId,
        memberName: member.memberName,
        membershipId: membership.membershipId,
        membershipStatus: membership.membershipStatus,
      };
    })
    .filter((member): member is NonNullable<typeof member> => member != null);

  return {
    ...summary,
    loginId: trainer.loginId,
    assignedMembers,
  };
}

function filterTrainers(url: URL) {
  const keyword = url.searchParams.get("keyword")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim().toUpperCase() ?? "";

  return mockTrainers
    .filter((trainer) => !status || trainer.userStatus === status)
    .filter((trainer) => {
      if (!keyword) {
        return true;
      }
      return (
        trainer.displayName.includes(keyword) ||
        trainer.loginId.includes(keyword) ||
        (trainer.phone ?? "").includes(keyword)
      );
    })
    .map((trainer) => buildMockTrainerSummary(trainer));
}

export function getMockTrainerDetail(userId: number) {
  const trainer = mockTrainers.find((item) => item.userId === userId);
  return trainer ? buildMockTrainerDetail(trainer) : null;
}

export function createMockTrainer(input: {
  centerId: number;
  loginId: string;
  password: string;
  displayName: string;
  phone: string | null;
}) {
  trainerIdSeed += 1;
  const nextTrainer: MockTrainerRecord = {
    userId: trainerIdSeed,
    centerId: input.centerId,
    loginId: input.loginId,
    displayName: input.displayName,
    phone: input.phone,
    userStatus: "ACTIVE",
  };
  mockTrainers = [nextTrainer, ...mockTrainers];
  bumpMockDataVersion();
  return buildMockTrainerDetail(nextTrainer);
}

export function updateMockTrainer(
  userId: number,
  input: {
    loginId: string;
    displayName: string;
    phone: string | null;
  },
) {
  let nextTrainer: MockTrainerRecord | null = null;
  mockTrainers = mockTrainers.map((trainer) => {
    if (trainer.userId !== userId) {
      return trainer;
    }
    nextTrainer = {
      ...trainer,
      loginId: input.loginId,
      displayName: input.displayName,
      phone: input.phone,
    };
    return nextTrainer;
  });
  if (!nextTrainer) {
    return null;
  }
  bumpMockDataVersion();
  return buildMockTrainerDetail(nextTrainer);
}

export function updateMockTrainerStatus(
  userId: number,
  userStatus: "ACTIVE" | "INACTIVE",
) {
  let nextTrainer: MockTrainerRecord | null = null;
  mockTrainers = mockTrainers.map((trainer) => {
    if (trainer.userId !== userId) {
      return trainer;
    }
    nextTrainer = {
      ...trainer,
      userStatus,
    };
    return nextTrainer;
  });
  if (!nextTrainer) {
    return null;
  }
  bumpMockDataVersion();
  return buildMockTrainerDetail(nextTrainer);
}

export function getMockResponse(path: string): ApiEnvelope<unknown> | null {
  const url = new URL(path, "http://local.mock");

  if (url.pathname === "/api/v1/trainers") {
    return envelope(filterTrainers(url));
  }

  if (url.pathname.startsWith("/api/v1/trainers/")) {
    const segments = url.pathname.split("/").filter(Boolean);
    const userId = Number(segments[3]);
    const detail = getMockTrainerDetail(userId);
    return detail ? envelope(detail) : null;
  }

  if (url.pathname === "/api/v1/members") {
    return envelope(filterMembers(url));
  }

  if (url.pathname.startsWith("/api/v1/members/")) {
    const segments = url.pathname.split("/").filter(Boolean);
    const memberId = Number(segments[3]);
    if (segments[4] === "memberships") {
      return envelope(
        (mockMemberMemberships.get(memberId) ?? []).map((membership) => ({
          ...membership,
        })),
      );
    }
    if (segments[4] === "reservations") {
      return envelope(
        (mockReservationsByMemberId.get(memberId) ?? []).map((reservation) => ({
          ...reservation,
        })),
      );
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
            target.memberCode.includes(keyword),
        );
    return envelope(targets);
  }

  if (url.pathname === "/api/v1/reservations/schedules") {
    return envelope(
      mockReservationSchedules.map((schedule) => ({ ...schedule })),
    );
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
        : mockAccessEvents.filter(
            (event) => event.memberId === Number(memberId),
          );
    return envelope(
      filteredEvents.slice(0, limit).map((event) => ({ ...event })),
    );
  }

  if (url.pathname === "/api/v1/lockers/slots") {
    return envelope(filterLockerSlots(url).map((slot) => ({ ...slot })));
  }

  if (url.pathname === "/api/v1/lockers/assignments") {
    return envelope(
      filterLockerAssignments(url).map((assignment) => ({ ...assignment })),
    );
  }

  if (url.pathname === "/api/v1/products") {
    return envelope(filterProducts(url).map((product) => ({ ...product })));
  }

  if (url.pathname === "/api/v1/crm/messages") {
    return envelope({
      rows: filterCrmHistory(url),
    });
  }

  if (url.pathname === "/api/v1/settlements/sales-report") {
    return envelope(filterSettlementReport(url));
  }

  return null;
}

export function getTrainerScopedMemberIds(userId: number) {
  return new Set(trainerAssignedMemberIds.get(userId) ?? []);
}
