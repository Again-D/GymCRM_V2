import type { ApiEnvelope } from "./client";
import type {
  MemberDetail,
  MemberSummary,
  PtReservationCandidate,
  PtReservationCandidatesPayload,
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
import {
  DEFAULT_TRAINER_PAYROLL_SESSION_UNIT_PRICE,
} from "../pages/settlements/modules/types";
import type {
  SalesDashboard,
  SettlementRecentAdjustment,
  SettlementPaymentMethod,
  SettlementReport,
  SettlementTrendGranularity,
  TrainerMonthlyPtSummary,
  TrainerPayrollReport,
  TrainerPayrollRow,
  TrainerSettlementPreviewQuery,
  TrainerSettlementPreviewReport,
  TrainerSettlementPreviewRow,
  TrainerSettlementStatus,
  TrainerSettlementWorkspace,
} from "../pages/settlements/modules/types";
import type { ReservationTargetSummary } from "../pages/reservations/modules/useReservationTargetsQuery";
import type {
  TrainerDetail,
  TrainerSummary,
} from "../pages/trainers/modules/types";
import type { TrainerAvailabilitySnapshot } from "../pages/trainer-availability/modules/types";
import type { GxScheduleSnapshot } from "../pages/gx-schedules/modules/types";
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
  userName: string;
  phone: string | null;
  ptSessionUnitPrice: number | null;
  gxSessionUnitPrice: number | null;
  userStatus: "ACTIVE" | "INACTIVE";
};

type MockTrainerAvailabilityRuleRecord = {
  availabilityRuleId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type MockTrainerAvailabilityExceptionRecord = {
  availabilityExceptionId: number;
  exceptionDate: string;
  exceptionType: "OFF" | "OVERRIDE";
  overrideStartTime: string | null;
  overrideEndTime: string | null;
  memo: string | null;
};

type MockTrainerAvailabilityState = {
  weeklyRules: MockTrainerAvailabilityRuleRecord[];
  exceptions: MockTrainerAvailabilityExceptionRecord[];
};

type MockGxScheduleRuleRecord = {
  ruleId: number;
  trainerUserId: number;
  className: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  effectiveStartDate: string;
  active: boolean;
};

type MockGxScheduleExceptionRecord = {
  exceptionId: number;
  ruleId: number;
  exceptionDate: string;
  exceptionType: "OFF" | "OVERRIDE";
  overrideTrainerUserId: number | null;
  overrideStartTime: string | null;
  overrideEndTime: string | null;
  overrideCapacity: number | null;
  memo: string | null;
};

let trainerIdSeed = 42;
let trainerAvailabilityRuleIdSeed = 4;
let trainerAvailabilityExceptionIdSeed = 11;
let gxRuleIdSeed = 1;
let gxExceptionIdSeed = 1;
let mockTrainers: MockTrainerRecord[] = [
  {
    userId: 41,
    centerId: 1,
    loginId: "trainer-a",
    userName: "정트레이너",
    phone: "010-1111-2222",
    ptSessionUnitPrice: 50000,
    gxSessionUnitPrice: 30000,
    userStatus: "ACTIVE",
  },
  {
    userId: 42,
    centerId: 1,
    loginId: "trainer-b",
    userName: "김트레이너",
    phone: "010-3333-4444",
    ptSessionUnitPrice: 70000,
    gxSessionUnitPrice: null,
    userStatus: "ACTIVE",
  },
];

const initialTrainerAvailabilityByUserId = new Map<number, MockTrainerAvailabilityState>([
  [
    41,
    {
      weeklyRules: [
        {
          availabilityRuleId: 1,
          dayOfWeek: 1,
          startTime: "09:00:00",
          endTime: "18:00:00",
        },
        {
          availabilityRuleId: 2,
          dayOfWeek: 3,
          startTime: "10:00:00",
          endTime: "16:00:00",
        },
      ],
      exceptions: [
        {
          availabilityExceptionId: 11,
          exceptionDate: "2026-04-07",
          exceptionType: "OFF",
          overrideStartTime: null,
          overrideEndTime: null,
          memo: "세미나",
        },
      ],
    },
  ],
  [
    42,
    {
      weeklyRules: [
        {
          availabilityRuleId: 3,
          dayOfWeek: 2,
          startTime: "09:30:00",
          endTime: "18:30:00",
        },
        {
          availabilityRuleId: 4,
          dayOfWeek: 4,
          startTime: "12:00:00",
          endTime: "20:00:00",
        },
      ],
      exceptions: [],
    },
  ],
]);

const initialMockGxRules: MockGxScheduleRuleRecord[] = [
  {
    ruleId: 1,
    trainerUserId: 41,
    className: "아침 GX",
    dayOfWeek: 1,
    startTime: "07:00:00",
    endTime: "08:00:00",
    capacity: 12,
    effectiveStartDate: "2026-03-01",
    active: true,
  },
];

const initialMockGxExceptions: MockGxScheduleExceptionRecord[] = [
  {
    exceptionId: 1,
    ruleId: 1,
    exceptionDate: "2026-04-06",
    exceptionType: "OFF",
    overrideTrainerUserId: null,
    overrideStartTime: null,
    overrideEndTime: null,
    overrideCapacity: null,
    memo: "대회 일정",
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
        productId: 2,
        productNameSnapshot: "PT 10회권",
        productCategorySnapshot: "PT",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-03-01",
        endDate: "2026-06-30",
        remainingCount: 8,
        assignedTrainerId: 41,
        activeHoldStatus: null,
      },
      {
        membershipId: 9002,
        memberId: 101,
        productId: 1,
        productNameSnapshot: "헬스 3개월",
        productCategorySnapshot: "GYM",
        productTypeSnapshot: "DURATION",
        membershipStatus: "HOLDING",
        startDate: "2026-02-15",
        endDate: "2026-05-15",
        remainingCount: null,
        assignedTrainerId: null,
        activeHoldStatus: "ACTIVE",
        holdDaysUsed: 15,
        holdCountUsed: 1,
      },
      {
        membershipId: 9003,
        memberId: 101,
        productId: 2,
        productNameSnapshot: "만료된 PT 5회권",
        productCategorySnapshot: "PT",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2025-12-01",
        endDate: "2026-01-15",
        remainingCount: 3,
        assignedTrainerId: 41,
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
        productId: 2,
        productNameSnapshot: "PT 20회권",
        productCategorySnapshot: "PT",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-02-01",
        endDate: "2026-07-20",
        remainingCount: 12,
        assignedTrainerId: 42,
        activeHoldStatus: null,
      },
      {
        membershipId: 9012,
        memberId: 102,
        productId: 3,
        productNameSnapshot: "GX 12회권",
        productCategorySnapshot: "GX",
        productTypeSnapshot: "COUNT",
        membershipStatus: "ACTIVE",
        startDate: "2026-02-20",
        endDate: "2026-04-30",
        remainingCount: 0,
        assignedTrainerId: null,
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
    trainerUserId: 41,
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
    trainerUserId: 42,
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
    trainerUserId: null,
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
    allowHoldBypass: true,
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
    allowHoldBypass: false,
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
    allowHoldBypass: false,
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
  memberId: number;
  productId: number;
  paymentMethod: Exclude<SettlementPaymentMethod, "">;
  grossSales: number;
  refundAmount: number;
  canceledAmount?: number;
  memo?: string | null;
  approvalRef?: string | null;
};

type MockTrainerPayrollAggregate = {
  settlementMonth: string;
  trainerUserId: number | null;
  trainerName: string;
  completedClassCount: number;
};

type MockTrainerSettlementSnapshot = {
  settlementId: number;
  settlementMonth: string;
  trainerUserId: number | null;
  trainerName: string;
  completedClassCount: number;
  sessionUnitPrice: number;
  payrollAmount: number;
  settlementStatus: TrainerSettlementStatus;
  confirmedAt: string;
};

type MockPeriodSettlementRecord = {
  settlementId: number;
  trainerId: string;
  trainerName: string;
  settlementMonth: string;
  status: TrainerSettlementStatus;
  createdAt: string;
  confirmedAt: string | null;
  rows: TrainerSettlementPreviewRow[];
};

const initialSettlementTransactions: SettlementTransaction[] = [
  {
    transactionId: 21001,
    transactionDate: "2026-03-01",
    memberId: 101,
    productId: 1,
    paymentMethod: "CARD",
    grossSales: 180000,
    refundAmount: 0,
  },
  {
    transactionId: 21002,
    transactionDate: "2026-03-03",
    memberId: 102,
    productId: 2,
    paymentMethod: "CARD",
    grossSales: 550000,
    refundAmount: 0,
  },
  {
    transactionId: 21003,
    transactionDate: "2026-03-05",
    memberId: 101,
    productId: 2,
    paymentMethod: "TRANSFER",
    grossSales: 550000,
    refundAmount: 110000,
    memo: "부분 환불",
  },
  {
    transactionId: 21004,
    transactionDate: "2026-03-08",
    memberId: 103,
    productId: 1,
    paymentMethod: "CASH",
    grossSales: 180000,
    refundAmount: 0,
  },
  {
    transactionId: 21005,
    transactionDate: "2026-03-11",
    memberId: 102,
    productId: 3,
    paymentMethod: "ETC",
    grossSales: 220000,
    refundAmount: 220000,
    canceledAmount: 220000,
    memo: "당일 취소",
  },
  {
    transactionId: 21006,
    transactionDate: "2026-03-12",
    memberId: 101,
    productId: 2,
    paymentMethod: "CARD",
    grossSales: 550000,
    refundAmount: 0,
    approvalRef: "MOCK-APPROVAL-21006",
  },
];

const initialTrainerPayrollAggregates: MockTrainerPayrollAggregate[] = [
  {
    settlementMonth: "2026-03",
    trainerUserId: 41,
    trainerName: "정트레이너",
    completedClassCount: 12
  },
  {
    settlementMonth: "2026-03",
    trainerUserId: 42,
    trainerName: "김트레이너",
    completedClassCount: 9
  },
  {
    settlementMonth: "2026-04",
    trainerUserId: 41,
    trainerName: "정트레이너",
    completedClassCount: 6
  }
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
let mockTrainerAvailabilityByUserId = cloneTrainerAvailabilityMap(
  initialTrainerAvailabilityByUserId,
);
let mockGxRules = initialMockGxRules.map((rule) => ({ ...rule }));
let mockGxExceptions = initialMockGxExceptions.map((exception) => ({ ...exception }));
let mockSettlementTransactions = initialSettlementTransactions.map(
  (transaction) => ({ ...transaction }),
);
let mockTrainerPayrollAggregates = initialTrainerPayrollAggregates.map((aggregate) => ({ ...aggregate }));
let mockTrainerSettlementSnapshots: MockTrainerSettlementSnapshot[] = [];
let mockPeriodSettlements: MockPeriodSettlementRecord[] = [];
let mockDataVersion = 0;
let membershipIdSeed = 99000;
let reservationIdSeed = 5002;
let scheduleIdSeed = 7101;
let accessSessionIdSeed = 92000;
let accessEventIdSeed = 97000;
let lockerAssignmentIdSeed = 98000;
let productIdSeed = 200;
let crmMessageEventIdSeed = 12050;
let memberIdSeed = 103;
let trainerSettlementIdSeed = 5000;
let periodSettlementIdSeed = 9000;

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

function cloneTrainerAvailabilityMap(
  source: Map<number, MockTrainerAvailabilityState>,
) {
  return new Map(
    Array.from(source.entries(), ([userId, state]) => [
      userId,
      {
        weeklyRules: state.weeklyRules.map((rule) => ({ ...rule })),
        exceptions: state.exceptions.map((exception) => ({ ...exception })),
      },
    ]),
  );
}

function cloneMockGxRules(source: MockGxScheduleRuleRecord[]) {
  return source.map((rule) => ({ ...rule }));
}

function cloneMockGxExceptions(source: MockGxScheduleExceptionRecord[]) {
  return source.map((exception) => ({ ...exception }));
}

function cloneCrmHistoryRows(source: CrmHistoryRow[]) {
  return source.map((row) => ({ ...row }));
}

function cloneSettlementTransactions(source: SettlementTransaction[]) {
  return source.map((transaction) => ({ ...transaction }));
}

function cloneTrainerSettlementSnapshots(source: MockTrainerSettlementSnapshot[]) {
  return source.map((snapshot) => ({ ...snapshot }));
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
  return formatDateInSeoul(new Date());
}

function parseDateParts(dateText: string) {
  const [yearText, monthText, dayText] = dateText.split("-");
  return {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText)
  };
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateInSeoul(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function addDaysUtc(dateText: string, days: number) {
  const { year, month, day } = parseDateParts(dateText);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return formatUtcDate(next);
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
  return addDaysUtc(dateText, days);
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

function formatBucketLabel(bucketStartDate: string, granularity: SettlementTrendGranularity) {
  const { year, month, day } = parseDateParts(bucketStartDate);
  if (granularity === "DAILY") {
    return `${year}-${month}-${day}`;
  }
  if (granularity === "MONTHLY") {
    return `${year}-${month}`;
  }
  if (granularity === "YEARLY") {
    return `${year}`;
  }
  return `${bucketStartDate} 주간`;
}

function toBucketStartDate(dateText: string, granularity: SettlementTrendGranularity) {
  if (granularity === "DAILY") {
    return dateText;
  }
  if (granularity === "MONTHLY") {
    return `${dateText.slice(0, 7)}-01`;
  }
  if (granularity === "YEARLY") {
    return `${dateText.slice(0, 4)}-01-01`;
  }

  const { year, month, day } = parseDateParts(dateText);
  const start = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = start.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setUTCDate(start.getUTCDate() + diff);
  return formatUtcDate(start);
}

function filterSalesDashboard(url: URL): SalesDashboard {
  const baseDate = url.searchParams.get("baseDate")?.trim() ?? todayText();
  const parsedExpiringWithinDays = Number.parseInt(url.searchParams.get("expiringWithinDays") ?? "7", 10);
  const expiringWithinDays = Number.isFinite(parsedExpiringWithinDays) ? parsedExpiringWithinDays : 7;
  const monthPrefix = baseDate.slice(0, 7);

  const todayTransactions = mockSettlementTransactions.filter((transaction) => transaction.transactionDate === baseDate);
  const monthTransactions = mockSettlementTransactions.filter((transaction) => transaction.transactionDate.startsWith(monthPrefix));
  const newMemberCount = mockMembers.filter((member) => member.joinDate === baseDate).length;
  const expiringMemberCount = Array.from(mockMemberMemberships.values())
    .flat()
    .filter((membership) =>
      membership.endDate != null &&
      membership.endDate >= baseDate &&
      membership.endDate <= addDaysUtc(baseDate, expiringWithinDays)
    ).length;

  return {
    baseDate,
    expiringWithinDays,
    todayNetSales: todayTransactions.reduce((sum, transaction) => sum + transaction.grossSales - transaction.refundAmount, 0),
    monthNetSales: monthTransactions.reduce((sum, transaction) => sum + transaction.grossSales - transaction.refundAmount, 0),
    newMemberCount,
    expiringMemberCount,
    refundCount: todayTransactions.filter((transaction) => transaction.refundAmount > 0).length
  };
}

function filterSettlementReport(url: URL): SettlementReport {
  const startDate = url.searchParams.get("startDate")?.trim() ?? todayText();
  const endDate = url.searchParams.get("endDate")?.trim() ?? todayText();
  const paymentMethod = (url.searchParams.get("paymentMethod")?.trim() ??
    "") as SettlementPaymentMethod;
  const productKeyword = url.searchParams.get("productKeyword")?.trim() ?? "";
  const trendGranularity = (url.searchParams.get("trendGranularity")?.trim() ??
    "DAILY") as SettlementTrendGranularity;

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

  const groupedTrend = new Map<
    string,
    {
      bucketStartDate: string;
      bucketLabel: string;
      grossSales: number;
      refundAmount: number;
      netSales: number;
      transactionCount: number;
    }
  >();

  for (const transaction of mockSettlementTransactions) {
    if (transaction.transactionDate < startDate || transaction.transactionDate > endDate) {
      continue;
    }
    if (paymentMethod && transaction.paymentMethod !== paymentMethod) {
      continue;
    }
    const product = mockProducts.find((item) => item.productId === transaction.productId);
    const productName = product?.productName ?? `상품 #${transaction.productId}`;
    if (productKeyword && !productName.includes(productKeyword)) {
      continue;
    }

    const bucketStartDate = toBucketStartDate(transaction.transactionDate, trendGranularity);
    const bucketLabel = formatBucketLabel(bucketStartDate, trendGranularity);
    const current = groupedTrend.get(bucketStartDate) ?? {
      bucketStartDate,
      bucketLabel,
      grossSales: 0,
      refundAmount: 0,
      netSales: 0,
      transactionCount: 0
    };

    current.grossSales += transaction.grossSales;
    current.refundAmount += transaction.refundAmount;
    current.netSales += transaction.grossSales - transaction.refundAmount;
    current.transactionCount += 1;
    groupedTrend.set(bucketStartDate, current);
  }

  const trend = Array.from(groupedTrend.values()).sort((left, right) =>
    left.bucketStartDate.localeCompare(right.bucketStartDate)
  );

  return {
    startDate,
    endDate,
    paymentMethod: paymentMethod || null,
    productKeyword: productKeyword || null,
    trendGranularity,
    totalGrossSales: rows.reduce((sum, row) => sum + row.grossSales, 0),
    totalRefundAmount: rows.reduce((sum, row) => sum + row.refundAmount, 0),
    totalNetSales: rows.reduce((sum, row) => sum + row.netSales, 0),
    trend,
    rows,
  };
}

function filterSettlementRecentAdjustments(url: URL): SettlementRecentAdjustment[] {
  const startDate = url.searchParams.get("startDate")?.trim() ?? todayText();
  const endDate = url.searchParams.get("endDate")?.trim() ?? todayText();
  const paymentMethod = (url.searchParams.get("paymentMethod")?.trim() ?? "") as SettlementPaymentMethod;
  const productKeyword = url.searchParams.get("productKeyword")?.trim() ?? "";
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "5", 10) || 5;

  return mockSettlementTransactions
    .filter((transaction) => transaction.transactionDate >= startDate && transaction.transactionDate <= endDate)
    .filter((transaction) => !paymentMethod || transaction.paymentMethod === paymentMethod)
    .map((transaction) => {
      const product = mockProducts.find((item) => item.productId === transaction.productId);
      const member = mockMembers.find((item) => item.memberId === transaction.memberId);
      return {
        transaction,
        productName: product?.productName ?? `상품 #${transaction.productId}`,
        memberName: member?.memberName ?? `회원 #${transaction.memberId}`
      };
    })
    .filter(({ transaction, productName }) => !productKeyword || productName.includes(productKeyword))
    .flatMap(({ transaction, productName, memberName }) => {
      const rows: SettlementRecentAdjustment[] = [];
      if (transaction.refundAmount > 0) {
        rows.push({
          paymentId: transaction.transactionId,
          adjustmentType: "REFUND",
          productName,
          memberName,
          paymentMethod: transaction.paymentMethod,
          amount: transaction.refundAmount,
          paidAt: `${transaction.transactionDate}T10:00:00+09:00`,
          memo: transaction.memo ?? null,
          approvalRef: transaction.approvalRef ?? null
        });
      }
      return rows;
    })
    .sort((left, right) => {
      if (left.paidAt !== right.paidAt) {
        return right.paidAt.localeCompare(left.paidAt);
      }
      return right.paymentId - left.paymentId;
    })
    .slice(0, limit);
}

function buildTrainerPayrollReport(settlementMonth: string, sessionUnitPrice: number): TrainerPayrollReport {
  const confirmedRows = mockTrainerSettlementSnapshots
    .filter((snapshot) => snapshot.settlementMonth === settlementMonth)
    .sort((left, right) => {
      if (right.completedClassCount !== left.completedClassCount) {
        return right.completedClassCount - left.completedClassCount;
      }
      return left.trainerName.localeCompare(right.trainerName, "ko");
    });

  if (confirmedRows.length > 0) {
    const rows: TrainerPayrollRow[] = confirmedRows.map((snapshot) => ({
      settlementId: snapshot.settlementId,
      trainerUserId: snapshot.trainerUserId,
      trainerName: snapshot.trainerName,
      completedClassCount: snapshot.completedClassCount,
      sessionUnitPrice: snapshot.sessionUnitPrice,
      payrollAmount: snapshot.payrollAmount
    }));
    return {
      settlementMonth,
      sessionUnitPrice: confirmedRows[0].sessionUnitPrice,
      totalCompletedClassCount: rows.reduce((sum, row) => sum + row.completedClassCount, 0),
      totalPayrollAmount: rows.reduce((sum, row) => sum + row.payrollAmount, 0),
      settlementStatus: "CONFIRMED",
      confirmedAt: confirmedRows[0].confirmedAt,
      rows
    };
  }

  const rows: TrainerPayrollRow[] = mockTrainerPayrollAggregates
    .filter((aggregate) => aggregate.settlementMonth === settlementMonth)
    .sort((left, right) => {
      if (right.completedClassCount !== left.completedClassCount) {
        return right.completedClassCount - left.completedClassCount;
      }
      return left.trainerName.localeCompare(right.trainerName, "ko");
    })
    .map((aggregate) => ({
      settlementId: null,
      trainerUserId: aggregate.trainerUserId,
      trainerName: aggregate.trainerName,
      completedClassCount: aggregate.completedClassCount,
      sessionUnitPrice,
      payrollAmount: aggregate.completedClassCount * sessionUnitPrice
    }));

  return {
    settlementMonth,
    sessionUnitPrice,
    totalCompletedClassCount: rows.reduce((sum, row) => sum + row.completedClassCount, 0),
    totalPayrollAmount: rows.reduce((sum, row) => sum + row.payrollAmount, 0),
    settlementStatus: "DRAFT",
    confirmedAt: null,
    rows
  };
}

function filterTrainerPayroll(url: URL): TrainerPayrollReport {
  const settlementMonth = url.searchParams.get("settlementMonth")?.trim() ?? todayText().slice(0, 7);
  const sessionUnitPrice = Number(url.searchParams.get("sessionUnitPrice") ?? "50000");
  const scopedTrainerUserId = parseOptionalTrainerUserId(url.searchParams.get("trainerUserId"));
  return scopeTrainerPayrollReport(
    buildTrainerPayrollReport(settlementMonth, sessionUnitPrice),
    scopedTrainerUserId
  );
}

function filterTrainerMonthlyPtSummary(url: URL): TrainerMonthlyPtSummary {
  const settlementMonth = url.searchParams.get("settlementMonth")?.trim() ?? todayText().slice(0, 7);
  const trainerUserId = parseOptionalTrainerUserId(url.searchParams.get("trainerUserId"));
  const report = scopeTrainerPayrollReport(
    buildTrainerPayrollReport(settlementMonth, DEFAULT_TRAINER_PAYROLL_SESSION_UNIT_PRICE),
    trainerUserId
  );
  const row = report.rows[0];
  const fallbackTrainer = mockTrainers.find((trainer) => trainer.userId === trainerUserId);

  return {
    settlementMonth,
    trainerUserId: trainerUserId ?? row?.trainerUserId ?? 0,
    trainerName: row?.trainerName ?? fallbackTrainer?.userName ?? "트레이너",
    completedClassCount: report.totalCompletedClassCount
  };
}

function parseOptionalTrainerUserId(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function scopeTrainerPayrollReport(report: TrainerPayrollReport, trainerUserId: number | null) {
  if (trainerUserId == null) {
    return report;
  }
  const rows = report.rows.filter((row) => row.trainerUserId === trainerUserId);
  return {
    ...report,
    totalCompletedClassCount: rows.reduce((sum, row) => sum + row.completedClassCount, 0),
    totalPayrollAmount: rows.reduce((sum, row) => sum + row.payrollAmount, 0),
    rows
  } satisfies TrainerPayrollReport;
}

function getMockTrainerRates(trainerUserId: number) {
  const trainer = mockTrainers.find((item) => item.userId === trainerUserId);
  return {
    ptRatePerSession: trainer?.ptSessionUnitPrice ?? null,
    gxRatePerSession: trainer?.gxSessionUnitPrice ?? null,
  };
}

function daysInMonth(monthText: string) {
  const year = Number(monthText.slice(0, 4));
  const month = Number(monthText.slice(5, 7));
  return new Date(year, month, 0).getDate();
}

function buildTrainerSettlementPreview(query: TrainerSettlementPreviewQuery): TrainerSettlementPreviewReport {
  const settlementMonth = query.settlementMonth;

  const baseRows = scopeTrainerPayrollReport(
    buildTrainerPayrollReport(settlementMonth, DEFAULT_TRAINER_PAYROLL_SESSION_UNIT_PRICE),
    query.trainerId === "ALL" ? null : Number(query.trainerId)
  ).rows;

  const rows: TrainerSettlementPreviewRow[] = baseRows.map((row) => {
    const rates = getMockTrainerRates(row.trainerUserId ?? 0);
    const completedSessions = Math.max(0, row.completedClassCount);
    const ptSessions = completedSessions;
    const gxSessions = 0;
    const totalSessions = completedSessions;
    const hasRateWarning = rates.ptRatePerSession == null || rates.gxRatePerSession == null;
    const ptAmount = rates.ptRatePerSession == null ? null : ptSessions * rates.ptRatePerSession;
    const gxAmount = rates.gxRatePerSession == null ? null : gxSessions * rates.gxRatePerSession;
    const totalAmount =
      ptAmount == null || gxAmount == null ? null : ptAmount + gxAmount;
    return {
      trainerUserId: row.trainerUserId ?? 0,
      trainerName: row.trainerName,
      totalSessions,
      completedSessions,
      cancelledSessions: 0,
      noShowSessions: 0,
      ptSessions,
      gxSessions,
      ptRatePerSession: rates.ptRatePerSession,
      gxRatePerSession: rates.gxRatePerSession,
      ptAmount,
      gxAmount,
      totalAmount,
      hasRateWarning,
      rateWarningMessage: hasRateWarning
        ? "PT/GX 단가가 미설정입니다. 트레이너 관리에서 설정하세요."
        : null
    };
  });

  const hasConflict = mockPeriodSettlements.some((settlement) =>
    settlement.status === "CONFIRMED" &&
    settlement.settlementMonth === query.settlementMonth
  );
  const periodStart = `${settlementMonth}-01`;
  const periodEnd = `${settlementMonth}-${String(daysInMonth(settlementMonth)).padStart(2, "0")}`;

  return {
    settlementMonth,
    scope: {
      trainerId: query.trainerId,
      trainerName: query.trainerId === "ALL"
        ? "전체 트레이너"
        : rows[0]?.trainerName ?? `트레이너 #${query.trainerId}`
    },
    period: {
      start: periodStart,
      end: periodEnd
    },
    summary: {
      totalSessions: rows.reduce((sum, row) => sum + row.totalSessions, 0),
      completedSessions: rows.reduce((sum, row) => sum + row.completedSessions, 0),
      cancelledSessions: rows.reduce((sum, row) => sum + row.cancelledSessions, 0),
      noShowSessions: rows.reduce((sum, row) => sum + row.noShowSessions, 0),
      totalAmount: rows.some((row) => row.totalAmount == null)
        ? null
        : rows.reduce((sum, row) => sum + (row.totalAmount ?? 0), 0),
      hasRateWarnings: rows.some((row) => row.hasRateWarning)
    },
    conflict: {
      hasConflict,
      createAllowed:
        rows.some((row) => row.completedSessions > 0) &&
        !hasConflict &&
        !rows.some((row) => row.hasRateWarning)
    },
    rows
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
  mockTrainerAvailabilityByUserId = cloneTrainerAvailabilityMap(
    initialTrainerAvailabilityByUserId,
  );
  mockGxRules = cloneMockGxRules(initialMockGxRules);
  mockGxExceptions = cloneMockGxExceptions(initialMockGxExceptions);
  mockSettlementTransactions = cloneSettlementTransactions(
    initialSettlementTransactions,
  );
  mockTrainerPayrollAggregates = initialTrainerPayrollAggregates.map((aggregate) => ({ ...aggregate }));
  mockTrainerSettlementSnapshots = [];
  mockPeriodSettlements = [];
  mockDataVersion = 0;
  membershipIdSeed = 99000;
  reservationIdSeed = 5002;
  scheduleIdSeed = 7101;
  accessSessionIdSeed = 92000;
  accessEventIdSeed = 97000;
  lockerAssignmentIdSeed = 98000;
  productIdSeed = 200;
  crmMessageEventIdSeed = 12050;
  memberIdSeed = 103;
  trainerAvailabilityRuleIdSeed = 4;
  trainerAvailabilityExceptionIdSeed = 11;
  gxRuleIdSeed = 1;
  gxExceptionIdSeed = 1;
  trainerSettlementIdSeed = 5000;
  periodSettlementIdSeed = 9000;
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
  assignedTrainerId?: number | null;
  productId: number;
  startDate: string;
  endDate: string | null;
  remainingCount: number | null;
}) {
  membershipIdSeed += 1;
  const membership: PurchasedMembership = {
    membershipId: membershipIdSeed,
    memberId: input.memberId,
    productId: input.productId,
    productNameSnapshot: input.productNameSnapshot,
    productCategorySnapshot:
      input.productNameSnapshot.includes("PT")
        ? "PT"
        : input.productNameSnapshot.includes("GX")
          ? "GX"
          : null,
    productTypeSnapshot: input.productTypeSnapshot,
    membershipStatus: "ACTIVE",
    startDate: input.startDate,
    endDate: input.endDate,
    remainingCount: input.remainingCount,
    assignedTrainerId: null,
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

function formatMockIso(dateText: string, timeText: string) {
  return `${dateText}T${timeText}+09:00`;
}

function getMockPtReservationCandidates(
  membershipId: number,
  trainerUserId: number,
  date: string,
): PtReservationCandidatesPayload {
  const membership = Array.from(mockMemberMemberships.values())
    .flat()
    .find((item) => item.membershipId === membershipId);
  const trainer = mockTrainers.find((item) => item.userId === trainerUserId);
  const memberReservations = membership
    ? mockReservationsByMemberId.get(membership.memberId) ?? []
    : [];

  if (!membership || membership.productCategorySnapshot !== "PT" || !trainer) {
    return {
      date,
      trainerUserId,
      membershipId,
      slotDurationMinutes: 60,
      slotStepMinutes: 30,
      items: [],
    };
  }

  const weekday = new Date(`${date}T00:00:00+09:00`).getDay();
  const normalizedWeekday = weekday === 0 ? 7 : weekday;
  const availability = mockTrainerAvailabilityByUserId.get(trainerUserId);
  const rule = availability?.weeklyRules.find((item) => item.dayOfWeek === normalizedWeekday);
  if (!rule) {
    return {
      date,
      trainerUserId,
      membershipId,
      slotDurationMinutes: 60,
      slotStepMinutes: 30,
      items: [],
    };
  }

  const trainerReservations = Array.from(mockReservationsByMemberId.values())
    .flat()
    .map((reservation) => {
      const schedule = mockReservationSchedules.find((item) => item.scheduleId === reservation.scheduleId);
      return schedule && schedule.trainerUserId === trainerUserId && reservation.reservationStatus === "CONFIRMED"
        ? schedule
        : null;
    })
    .filter((item): item is ReservationScheduleSummary => item != null);

  const memberBlocks = memberReservations
    .map((reservation) => mockReservationSchedules.find((item) => item.scheduleId === reservation.scheduleId))
    .filter((item): item is ReservationScheduleSummary => item != null && item.scheduleType !== undefined && memberReservations.some((reservation) => reservation.scheduleId === item.scheduleId && reservation.reservationStatus === "CONFIRMED"));

  const [startHour, startMinute] = rule.startTime.split(":").map(Number);
  const [endHour, endMinute] = rule.endTime.split(":").map(Number);
  const windowStartMinutes = startHour * 60 + startMinute;
  const windowEndMinutes = endHour * 60 + endMinute;
  const items: PtReservationCandidate[] = [];

  for (let startMinutes = windowStartMinutes; startMinutes + 60 <= windowEndMinutes; startMinutes += 30) {
    const candidateStartHour = String(Math.floor(startMinutes / 60)).padStart(2, "0");
    const candidateStartMinute = String(startMinutes % 60).padStart(2, "0");
    const candidateEndTotalMinutes = startMinutes + 60;
    const candidateEndHour = String(Math.floor(candidateEndTotalMinutes / 60)).padStart(2, "0");
    const candidateEndMinute = String(candidateEndTotalMinutes % 60).padStart(2, "0");
    const candidateStartAt = formatMockIso(date, `${candidateStartHour}:${candidateStartMinute}:00`);
    const candidateEndAt = formatMockIso(date, `${candidateEndHour}:${candidateEndMinute}:00`);
    const candidateStartTime = new Date(candidateStartAt).getTime();
    const candidateEndTime = new Date(candidateEndAt).getTime();
    const overlapsTrainer = trainerReservations.some((schedule) => {
      const scheduleStart = new Date(schedule.startAt).getTime();
      const scheduleEnd = new Date(schedule.endAt).getTime();
      return candidateStartTime < scheduleEnd && scheduleStart < candidateEndTime;
    });
    const overlapsMember = memberBlocks.some((schedule) => {
      const scheduleStart = new Date(schedule.startAt).getTime();
      const scheduleEnd = new Date(schedule.endAt).getTime();
      return candidateStartTime < scheduleEnd && scheduleStart < candidateEndTime;
    });
    if (overlapsTrainer || overlapsMember || candidateStartTime <= Date.now()) {
      continue;
    }
    items.push({
      startAt: candidateStartAt,
      endAt: candidateEndAt,
      source: "MOCK_AVAILABILITY",
    });
  }

  return {
    date,
    trainerUserId,
    membershipId,
    slotDurationMinutes: 60,
    slotStepMinutes: 30,
    items,
  };
}

export function createMockPtReservation(input: {
  memberId: number;
  membershipId: number;
  trainerUserId: number;
  startAt: string;
  memo?: string | null;
}) {
  const trainer = mockTrainers.find((item) => item.userId === input.trainerUserId);
  const startAt = new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  scheduleIdSeed += 1;
  const schedule: ReservationScheduleSummary = {
    scheduleId: scheduleIdSeed,
    scheduleType: "PT",
    trainerUserId: input.trainerUserId,
    trainerName: trainer?.userName ?? `트레이너 #${input.trainerUserId}`,
    slotTitle: "PT 예약",
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    capacity: 1,
    currentCount: 1,
  };
  mockReservationSchedules = [schedule, ...mockReservationSchedules];

  const memberships = mockMemberMemberships.get(input.memberId) ?? [];
  mockMemberMemberships.set(
    input.memberId,
    memberships.map((membership) =>
      membership.membershipId === input.membershipId && membership.remainingCount != null
        ? { ...membership, remainingCount: Math.max(0, membership.remainingCount - 1) }
        : membership,
    ),
  );

  return createMockReservation({
    memberId: input.memberId,
    membershipId: input.membershipId,
    scheduleId: schedule.scheduleId,
    memo: input.memo,
  });
}

function isMockScheduleVisibleByDefault(schedule: ReservationScheduleSummary) {
  const startAt = new Date(schedule.startAt).getTime();
  return Number.isFinite(startAt) && startAt > Date.now();
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
    userName: trainer.userName,
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
    ptSessionUnitPrice: trainer.ptSessionUnitPrice,
    gxSessionUnitPrice: trainer.gxSessionUnitPrice,
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
        trainer.userName.includes(keyword) ||
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
  userName: string;
  phone: string | null;
  ptSessionUnitPrice: number | null;
  gxSessionUnitPrice: number | null;
}) {
  trainerIdSeed += 1;
  const nextTrainer: MockTrainerRecord = {
    userId: trainerIdSeed,
    centerId: input.centerId,
    loginId: input.loginId,
    userName: input.userName,
    phone: input.phone,
    ptSessionUnitPrice: input.ptSessionUnitPrice,
    gxSessionUnitPrice: input.gxSessionUnitPrice,
    userStatus: "ACTIVE",
  };
  mockTrainers = [nextTrainer, ...mockTrainers];
  mockTrainerAvailabilityByUserId.set(nextTrainer.userId, {
    weeklyRules: [],
    exceptions: [],
  });
  bumpMockDataVersion();
  return buildMockTrainerDetail(nextTrainer);
}

export function updateMockTrainer(
  userId: number,
  input: {
    loginId: string;
    userName: string;
    phone: string | null;
    ptSessionUnitPrice: number | null;
    gxSessionUnitPrice: number | null;
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
      userName: input.userName,
      phone: input.phone,
      ptSessionUnitPrice: input.ptSessionUnitPrice,
      gxSessionUnitPrice: input.gxSessionUnitPrice,
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

function getDayOfWeekNumber(dateText: string) {
  const day = new Date(`${dateText}T00:00:00+09:00`).getDay();
  return day === 0 ? 7 : day;
}

function buildMockTrainerAvailabilitySnapshot(
  userId: number,
  month: string,
): TrainerAvailabilitySnapshot {
  const state = mockTrainerAvailabilityByUserId.get(userId) ?? {
    weeklyRules: [],
    exceptions: [],
  };
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const exceptionByDate = new Map(
    state.exceptions.map((exception) => [exception.exceptionDate, exception]),
  );
  const ruleByDay = new Map(state.weeklyRules.map((rule) => [rule.dayOfWeek, rule]));

  return {
    trainerUserId: userId,
    month,
    weeklyRules: state.weeklyRules.map((rule) => ({ ...rule })),
    exceptions: state.exceptions
      .filter((exception) => exception.exceptionDate.startsWith(`${month}-`))
      .map((exception) => ({ ...exception })),
    effectiveDays: Array.from({ length: lastDay }, (_, index) => {
      const dayOfMonth = `${index + 1}`.padStart(2, "0");
      const date = `${month}-${dayOfMonth}`;
      const exception = exceptionByDate.get(date);
      if (exception) {
        if (exception.exceptionType === "OFF") {
          return {
            date,
            source: "EXCEPTION_OFF" as const,
            availabilityStatus: "OFF" as const,
            startTime: null,
            endTime: null,
            memo: exception.memo,
          };
        }
        return {
          date,
          source: "EXCEPTION_OVERRIDE" as const,
          availabilityStatus: "AVAILABLE" as const,
          startTime: exception.overrideStartTime,
          endTime: exception.overrideEndTime,
          memo: exception.memo,
        };
      }

      const weeklyRule = ruleByDay.get(getDayOfWeekNumber(date));
      if (!weeklyRule) {
        return {
          date,
          source: "NONE" as const,
          availabilityStatus: "UNSET" as const,
          startTime: null,
          endTime: null,
          memo: null,
        };
      }
      return {
        date,
        source: "WEEKLY_RULE" as const,
        availabilityStatus: "AVAILABLE" as const,
        startTime: weeklyRule.startTime,
        endTime: weeklyRule.endTime,
        memo: null,
      };
    }),
  };
}

export function getMockTrainerAvailabilitySnapshot(userId: number, month: string) {
  return buildMockTrainerAvailabilitySnapshot(userId, month);
}

export function replaceMockTrainerAvailabilityWeeklyRules(
  userId: number,
  month: string,
  rules: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
) {
  mockTrainerAvailabilityByUserId.set(userId, {
    weeklyRules: rules.map((rule) => {
      trainerAvailabilityRuleIdSeed += 1;
      return {
        availabilityRuleId: trainerAvailabilityRuleIdSeed,
        dayOfWeek: rule.dayOfWeek,
        startTime: `${rule.startTime}:00`,
        endTime: `${rule.endTime}:00`,
      };
    }),
    exceptions: mockTrainerAvailabilityByUserId.get(userId)?.exceptions ?? [],
  });
  bumpMockDataVersion();
  return buildMockTrainerAvailabilitySnapshot(userId, month);
}

export function upsertMockTrainerAvailabilityException(
  userId: number,
  month: string,
  exceptionDate: string,
  payload: {
    exceptionType: "OFF" | "OVERRIDE";
    overrideStartTime: string | null;
    overrideEndTime: string | null;
    memo: string | null;
  },
) {
  const current = mockTrainerAvailabilityByUserId.get(userId) ?? {
    weeklyRules: [],
    exceptions: [],
  };
  const existing = current.exceptions.find(
    (exception) => exception.exceptionDate === exceptionDate,
  );
  const nextException: MockTrainerAvailabilityExceptionRecord = {
    availabilityExceptionId:
      existing?.availabilityExceptionId ?? ++trainerAvailabilityExceptionIdSeed,
    exceptionDate,
    exceptionType: payload.exceptionType,
    overrideStartTime: payload.overrideStartTime
      ? `${payload.overrideStartTime}:00`
      : null,
    overrideEndTime: payload.overrideEndTime ? `${payload.overrideEndTime}:00` : null,
    memo: payload.memo,
  };

  mockTrainerAvailabilityByUserId.set(userId, {
    weeklyRules: current.weeklyRules,
    exceptions: [
      ...current.exceptions.filter(
        (exception) => exception.exceptionDate !== exceptionDate,
      ),
      nextException,
    ].sort((left, right) => left.exceptionDate.localeCompare(right.exceptionDate)),
  });
  bumpMockDataVersion();
  return buildMockTrainerAvailabilitySnapshot(userId, month);
}

export function deleteMockTrainerAvailabilityException(
  userId: number,
  month: string,
  exceptionDate: string,
) {
  const current = mockTrainerAvailabilityByUserId.get(userId) ?? {
    weeklyRules: [],
    exceptions: [],
  };
  mockTrainerAvailabilityByUserId.set(userId, {
    weeklyRules: current.weeklyRules,
    exceptions: current.exceptions.filter(
      (exception) => exception.exceptionDate !== exceptionDate,
    ),
  });
  bumpMockDataVersion();
  return buildMockTrainerAvailabilitySnapshot(userId, month);
}

function buildMockGxScheduleSnapshot(
  month: string,
  actor?: { userId: number; roles: string[] | undefined | null },
): GxScheduleSnapshot {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  const visibleRules = actor?.roles?.includes("ROLE_TRAINER")
    ? mockGxRules.filter((rule) => rule.trainerUserId === actor.userId)
    : mockGxRules;
  const visibleRuleIds = new Set(visibleRules.map((rule) => rule.ruleId));
  const visibleExceptions = mockGxExceptions.filter(
    (exception) =>
      visibleRuleIds.has(exception.ruleId) &&
      exception.exceptionDate.startsWith(`${month}-`),
  );

  const generatedSchedules = Array.from({ length: lastDay }, (_, index) => {
    const day = `${index + 1}`.padStart(2, "0");
    const date = `${month}-${day}`;
    const dayOfWeek = getDayOfWeekNumber(date);
    return visibleRules.flatMap((rule) => {
      if (!rule.active || rule.dayOfWeek !== dayOfWeek || rule.effectiveStartDate > date) {
        return [];
      }
      const exception =
        mockGxExceptions.find(
          (item) => item.ruleId === rule.ruleId && item.exceptionDate === date,
        ) ?? null;
      if (exception?.exceptionType === "OFF") {
        return [];
      }
      const trainerUserId = exception?.overrideTrainerUserId ?? rule.trainerUserId;
      const trainer = mockTrainers.find((item) => item.userId === trainerUserId);
      const startTime = exception?.overrideStartTime ?? rule.startTime;
      const endTime = exception?.overrideEndTime ?? rule.endTime;
      return [
        {
          scheduleId: Number(`${rule.ruleId}${index + 1}`),
          sourceRuleId: rule.ruleId,
          sourceExceptionId: exception?.exceptionId ?? null,
          trainerUserId,
          trainerName: trainer?.userName ?? `트레이너 #${trainerUserId}`,
          className: rule.className,
          startAt: `${date}T${startTime}+09:00`,
          endAt: `${date}T${endTime}+09:00`,
          capacity: exception?.overrideCapacity ?? rule.capacity,
          currentCount: 0,
        },
      ];
    });
  }).flat();

  return {
    month,
    rules: visibleRules.map((rule) => ({ ...rule })),
    exceptions: visibleExceptions.map((exception) => ({ ...exception })),
    generatedSchedules,
  };
}

export function getMockGxScheduleSnapshot(
  month: string,
  actor?: { userId: number; roles: string[] | undefined | null },
) {
  return buildMockGxScheduleSnapshot(month, actor);
}

export function createMockGxScheduleRule(
  month: string,
  input: {
    className: string;
    trainerUserId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    capacity: number;
    effectiveStartDate: string;
  },
  actor?: { userId: number; roles: string[] | undefined | null },
) {
  gxRuleIdSeed += 1;
  mockGxRules = [
    ...mockGxRules,
    {
      ruleId: gxRuleIdSeed,
      trainerUserId: input.trainerUserId,
      className: input.className,
      dayOfWeek: input.dayOfWeek,
      startTime: `${input.startTime}:00`,
      endTime: `${input.endTime}:00`,
      capacity: input.capacity,
      effectiveStartDate: input.effectiveStartDate,
      active: true,
    },
  ];
  bumpMockDataVersion();
  return buildMockGxScheduleSnapshot(month, actor);
}

export function updateMockGxScheduleRule(
  ruleId: number,
  month: string,
  input: {
    className: string;
    trainerUserId: number;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    capacity: number;
    effectiveStartDate: string;
    active: boolean;
  },
  actor?: { userId: number; roles: string[] | undefined | null },
) {
  mockGxRules = mockGxRules.map((rule) =>
    rule.ruleId === ruleId
      ? {
          ...rule,
          className: input.className,
          trainerUserId: input.trainerUserId,
          dayOfWeek: input.dayOfWeek,
          startTime: `${input.startTime}:00`,
          endTime: `${input.endTime}:00`,
          capacity: input.capacity,
          effectiveStartDate: input.effectiveStartDate,
          active: input.active,
        }
      : rule,
  );
  bumpMockDataVersion();
  return buildMockGxScheduleSnapshot(month, actor);
}

export function deleteMockGxScheduleRule(
  ruleId: number,
  month: string,
  actor?: { userId: number; roles: string[] | undefined | null },
) {
  mockGxRules = mockGxRules.map((rule) =>
    rule.ruleId === ruleId ? { ...rule, active: false } : rule,
  );
  bumpMockDataVersion();
  return buildMockGxScheduleSnapshot(month, actor);
}

export function upsertMockGxScheduleException(
  ruleId: number,
  exceptionDate: string,
  month: string,
  payload: {
    exceptionType: "OFF" | "OVERRIDE";
    overrideTrainerUserId: number | null;
    overrideStartTime: string | null;
    overrideEndTime: string | null;
    overrideCapacity: number | null;
    memo: string | null;
  },
  actor?: { userId: number; roles: string[] | undefined | null },
) {
  const existing = mockGxExceptions.find(
    (exception) =>
      exception.ruleId === ruleId && exception.exceptionDate === exceptionDate,
  );
  const nextException: MockGxScheduleExceptionRecord = {
    exceptionId: existing?.exceptionId ?? ++gxExceptionIdSeed,
    ruleId,
    exceptionDate,
    exceptionType: payload.exceptionType,
    overrideTrainerUserId: payload.overrideTrainerUserId,
    overrideStartTime: payload.overrideStartTime
      ? `${payload.overrideStartTime}:00`
      : null,
    overrideEndTime: payload.overrideEndTime
      ? `${payload.overrideEndTime}:00`
      : null,
    overrideCapacity: payload.overrideCapacity,
    memo: payload.memo,
  };
  mockGxExceptions = [
    ...mockGxExceptions.filter(
      (exception) =>
        !(exception.ruleId === ruleId && exception.exceptionDate === exceptionDate),
    ),
    nextException,
  ].sort((left, right) => left.exceptionDate.localeCompare(right.exceptionDate));
  bumpMockDataVersion();
  return buildMockGxScheduleSnapshot(month, actor);
}

export function deleteMockGxScheduleException(
  ruleId: number,
  exceptionDate: string,
  month: string,
  actor?: { userId: number; roles: string[] | undefined | null },
) {
  mockGxExceptions = mockGxExceptions.filter(
    (exception) =>
      !(exception.ruleId === ruleId && exception.exceptionDate === exceptionDate),
  );
  bumpMockDataVersion();
  return buildMockGxScheduleSnapshot(month, actor);
}

export function getMockResponse(path: string): ApiEnvelope<unknown> | null {
  const url = new URL(path, "http://local.mock");

  if (url.pathname === "/api/v1/auth/trainers") {
    return envelope(
      mockTrainers
        .filter((trainer) => trainer.userStatus === "ACTIVE")
        .map((trainer) => ({
          userId: trainer.userId,
          centerId: trainer.centerId,
          userName: trainer.userName,
        })),
    );
  }

  if (url.pathname === "/api/v1/trainers") {
    return envelope(filterTrainers(url));
  }

  if (url.pathname.startsWith("/api/v1/trainers/")) {
    const segments = url.pathname.split("/").filter(Boolean);
    const userId = Number(segments[3]);
    if (segments[4] === "availability") {
      const month = url.searchParams.get("month") ?? "2026-04";
      return envelope(getMockTrainerAvailabilitySnapshot(userId, month));
    }
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

  if (url.pathname === "/api/v1/reservations") {
    const memberId = Number(url.searchParams.get("memberId"));
    const scheduleId = Number(url.searchParams.get("scheduleId"));
    const status = url.searchParams.get("status")?.trim().toUpperCase() ?? "";

    const reservations = Number.isInteger(memberId) && memberId > 0
      ? (mockReservationsByMemberId.get(memberId) ?? [])
      : Array.from(mockReservationsByMemberId.values()).flat();

    return envelope(
      reservations
        .filter((reservation) => !Number.isInteger(scheduleId) || scheduleId <= 0 || reservation.scheduleId === scheduleId)
        .filter((reservation) => !status || reservation.reservationStatus === status)
        .map((reservation) => ({ ...reservation })),
    );
  }

  if (url.pathname === "/api/v1/reservations/schedules") {
    const requestedScheduleIds = Array.from(
      new Set(
        url.searchParams
          .getAll("scheduleIds")
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );
    const visibleSchedules = mockReservationSchedules.filter((schedule) =>
      isMockScheduleVisibleByDefault(schedule) ||
      requestedScheduleIds.includes(schedule.scheduleId),
    );
    return envelope(
      visibleSchedules.map((schedule) => ({ ...schedule })),
    );
  }

  if (url.pathname === "/api/v1/reservations/pt-candidates") {
    const membershipId = Number(url.searchParams.get("membershipId"));
    const trainerUserId = Number(url.searchParams.get("trainerUserId"));
    const date = url.searchParams.get("date") ?? "";
    return envelope(
      getMockPtReservationCandidates(membershipId, trainerUserId, date),
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

  if (url.pathname === "/api/v1/reservations/gx/snapshot") {
    const month = url.searchParams.get("month") ?? "2026-04";
    return envelope(getMockGxScheduleSnapshot(month));
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

  if (url.pathname === "/api/v1/settlements/sales-dashboard") {
    return envelope(filterSalesDashboard(url));
  }

  if (url.pathname === "/api/v1/settlements/sales-report/recent-adjustments") {
    return envelope(filterSettlementRecentAdjustments(url));
  }

  if (url.pathname === "/api/v1/settlements/trainer-payroll") {
    return envelope(filterTrainerPayroll(url));
  }

  if (url.pathname === "/api/v1/settlements/trainer-payroll/my-summary") {
    return envelope(filterTrainerMonthlyPtSummary(url));
  }

  if (url.pathname === "/api/v1/settlements/preview") {
    return envelope(buildTrainerSettlementPreview({
      trainerId: url.searchParams.get("trainerId")?.trim() || "ALL",
      settlementMonth: url.searchParams.get("settlementMonth")?.trim() ?? todayText().slice(0, 7)
    }));
  }

  if (url.pathname === "/api/v1/settlements/trainer-payroll/my-preview") {
    return envelope(buildTrainerSettlementPreview({
      trainerId: "41",
      settlementMonth: url.searchParams.get("settlementMonth")?.trim() ?? todayText().slice(0, 7)
    }));
  }

  return null;
}

export function getTrainerScopedMemberIds(userId: number) {
  return new Set(trainerAssignedMemberIds.get(userId) ?? []);
}

export async function createMockTrainerSettlementConfirm(input: {
  settlementMonth: string;
  sessionUnitPrice: number;
}) {
  const report = buildTrainerPayrollReport(input.settlementMonth, input.sessionUnitPrice);
  if (report.settlementStatus === "CONFIRMED") {
    return {
      ok: false,
      message: "이미 확정된 월 정산이 존재합니다."
    };
  }
  if (report.rows.length === 0) {
    return {
      ok: false,
      message: "확정할 트레이너 정산 데이터가 없습니다."
    };
  }

  const confirmedAt = `${input.settlementMonth}-25T10:00:00+09:00`;
  mockTrainerSettlementSnapshots = [
    ...mockTrainerSettlementSnapshots.filter((snapshot) => snapshot.settlementMonth !== input.settlementMonth),
    ...report.rows.map((row) => ({
      settlementId: ++trainerSettlementIdSeed,
      settlementMonth: input.settlementMonth,
      trainerUserId: row.trainerUserId,
      trainerName: row.trainerName,
      completedClassCount: row.completedClassCount,
      sessionUnitPrice: input.sessionUnitPrice,
      payrollAmount: row.payrollAmount,
      settlementStatus: "CONFIRMED" as const,
      confirmedAt
    }))
  ];
  mockDataVersion += 1;

  return {
    ok: true,
    message: "mock 트레이너 정산이 확정되었습니다."
  };
}

function toMockWorkspace(settlement: MockPeriodSettlementRecord): TrainerSettlementWorkspace {
  const periodStart = `${settlement.settlementMonth}-01`;
  const periodEnd = `${settlement.settlementMonth}-${String(daysInMonth(settlement.settlementMonth)).padStart(2, "0")}`;
  const totalSessions = settlement.rows.reduce((sum, row) => sum + row.totalSessions, 0);
  const completedSessions = settlement.rows.reduce((sum, row) => sum + row.completedSessions, 0);
  const cancelledSessions = settlement.rows.reduce((sum, row) => sum + row.cancelledSessions, 0);
  const noShowSessions = settlement.rows.reduce((sum, row) => sum + row.noShowSessions, 0);
  const ptSessions = settlement.rows.reduce((sum, row) => sum + row.ptSessions, 0);
  const gxSessions = settlement.rows.reduce((sum, row) => sum + row.gxSessions, 0);
  const ptAmount = settlement.rows.reduce((sum, row) => sum + (row.ptAmount ?? 0), 0);
  const gxAmount = settlement.rows.reduce((sum, row) => sum + (row.gxAmount ?? 0), 0);

  return {
    settlementId: settlement.settlementId,
    trainer: {
      trainerId: settlement.trainerId,
      name: settlement.trainerName
    },
    period: {
      start: periodStart,
      end: periodEnd
    },
    summary: {
      totalSessions,
      completedSessions,
      cancelledSessions,
      noShowSessions,
      ptSessions,
      gxSessions
    },
    calculation: {
      ptRatePerSession: settlement.rows[0]?.ptRatePerSession ?? null,
      gxRatePerSession: settlement.rows[0]?.gxRatePerSession ?? null,
      ptAmount,
      gxAmount,
      bonus: 0,
      bonusReason: null,
      deduction: 0,
      deductionReason: null,
      totalAmount: ptAmount + gxAmount
    },
    status: settlement.status,
    createdAt: settlement.createdAt,
    confirmedAt: settlement.confirmedAt
  };
}

export async function createMockTrainerSettlementCreate(input: TrainerSettlementPreviewQuery) {
  const preview = buildTrainerSettlementPreview(input);
  if (!preview.conflict.createAllowed) {
    return {
      ok: false,
      message: preview.conflict.hasConflict
        ? "확정된 정산 기간과 겹치는 정산은 생성할 수 없습니다."
        : "생성할 트레이너 정산 데이터가 없습니다."
    };
  }

  const existing = mockPeriodSettlements.find((settlement) =>
    settlement.trainerId === input.trainerId &&
    settlement.settlementMonth === input.settlementMonth &&
    settlement.status === "DRAFT"
  );
  if (existing) {
    return {
      ok: true,
      data: toMockWorkspace(existing),
      message: "기존 mock 정산 초안을 재사용했습니다."
    };
  }

  const created: MockPeriodSettlementRecord = {
    settlementId: ++periodSettlementIdSeed,
    trainerId: input.trainerId,
    trainerName: preview.scope.trainerName,
    settlementMonth: input.settlementMonth,
    status: "DRAFT",
    createdAt: `${todayText()}T10:00:00+09:00`,
    confirmedAt: null,
    rows: preview.rows
  };

  mockPeriodSettlements = [...mockPeriodSettlements, created];
  mockDataVersion += 1;

  return {
    ok: true,
    data: toMockWorkspace(created),
    message: "mock 기간 정산 초안을 생성했습니다."
  };
}

export async function confirmMockTrainerSettlement(settlementId: number) {
  const target = mockPeriodSettlements.find((settlement) => settlement.settlementId === settlementId);
  if (!target) {
    return {
      ok: false,
      message: "정산을 찾을 수 없습니다."
    };
  }

  target.status = "CONFIRMED";
  target.confirmedAt = target.confirmedAt ?? `${todayText()}T10:00:00+09:00`;
  mockDataVersion += 1;

  return {
    ok: true,
    data: {
      settlementId,
      status: "CONFIRMED" as const,
      confirmedAt: target.confirmedAt
    },
    message: "mock 기간 정산을 확정했습니다."
  };
}

export async function downloadMockCanonicalTrainerSettlementDocument(settlementId: number, trainerId: string) {
  const target = mockPeriodSettlements.find((settlement) => settlement.settlementId === settlementId);
  if (!target || target.status !== "CONFIRMED") {
    return {
      ok: false,
      message: "확정된 정산만 출력할 수 있습니다.",
      fileName: null,
      content: null
    };
  }

  const row = target.rows.find((item) => String(item.trainerUserId) === trainerId);
  if (!row) {
    return {
      ok: false,
      message: "출력할 정산서 대상을 찾을 수 없습니다.",
      fileName: null,
      content: null
    };
  }

  return {
    ok: true,
    fileName: `settlement-${settlementId}-trainer-${trainerId}.pdf`,
    content: createMockPdfDocument([
      `Settlement Period: ${target.settlementMonth}-01 ~ ${target.settlementMonth}-${String(daysInMonth(target.settlementMonth)).padStart(2, "0")}`,
      `Trainer: ${row.trainerName}`,
      `Completed Classes: ${row.completedSessions}`,
      `Total Amount: ${row.totalAmount ?? 0}`
    ]),
    message: "mock 정산서를 생성했습니다."
  };
}

export async function downloadMockTrainerSettlementDocument(
  settlementMonth: string,
  trainerUserId: number | null = null
) {
  const report = scopeTrainerPayrollReport(
    buildTrainerPayrollReport(settlementMonth, 50000),
    trainerUserId
  );
  if (report.settlementStatus !== "CONFIRMED") {
    return {
      ok: false,
      message: "확정된 정산만 출력할 수 있습니다.",
      fileName: null,
      content: null
    };
  }
  if (report.rows.length === 0) {
    return {
      ok: false,
      message: "출력할 본인 정산서가 없습니다.",
      fileName: null,
      content: null
    };
  }

  const content = createMockPdfDocument([
    `Settlement Month: ${settlementMonth}`,
    ...report.rows.flatMap((row, index) => [
      `Trainer ${index + 1}: ${row.trainerName}`,
      `Completed Classes: ${row.completedClassCount}`,
      `Session Unit Price: ${row.sessionUnitPrice}`,
      `Payroll Amount: ${row.payrollAmount}`
    ])
  ]);

  return {
    ok: true,
    fileName: `trainer-settlement-${settlementMonth}.pdf`,
    content,
    message: "mock 정산서를 생성했습니다."
  };
}

export async function downloadMockSalesSettlementReport(filters: {
  startDate: string;
  endDate: string;
  paymentMethod: string;
  productKeyword: string;
  trendGranularity: string;
}) {
  const query = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
    trendGranularity: filters.trendGranularity
  });
  if (filters.paymentMethod) {
    query.set("paymentMethod", filters.paymentMethod);
  }
  if (filters.productKeyword) {
    query.set("productKeyword", filters.productKeyword);
  }

  const report = filterSettlementReport(
    new URL(`/api/v1/settlements/sales-report?${query.toString()}`, "http://local.mock")
  );

  return {
    ok: true,
    fileName: `sales-report-${filters.startDate}-to-${filters.endDate}.xlsx`,
    content: createMockXlsxDocument([
      "Sheet: Summary",
      `Start Date: ${report.startDate}`,
      `End Date: ${report.endDate}`,
      `Trend Granularity: ${report.trendGranularity}`,
      `Total Net Sales: ${report.totalNetSales}`,
      "Sheet: Trend",
      ...report.trend.map(
        (point) =>
          `${point.bucketLabel} | gross=${point.grossSales} refund=${point.refundAmount} net=${point.netSales}`
      ),
      "Sheet: Details",
      ...report.rows.map(
        (row) =>
          `${row.productName} | ${row.paymentMethod} | gross=${row.grossSales} refund=${row.refundAmount} net=${row.netSales}`
      )
    ])
  };
}

function createMockPdfDocument(lines: string[]) {
  return [
    "%PDF-1.4",
    ...lines.map((line) => `% ${line}`),
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "endobj",
    "3 0 obj",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
    "endobj",
    "trailer",
    "<< /Root 1 0 R >>",
    "%%EOF"
  ].join("\n");
}

function createMockXlsxDocument(lines: string[]) {
  const encoder = new TextEncoder();
  const header = encoder.encode("PK\u0003\u0004MOCK-XLSX\n");
  const body = encoder.encode(lines.join("\n"));
  const merged = new Uint8Array(header.length + body.length);
  merged.set(header, 0);
  merged.set(body, header.length);
  return merged;
}
