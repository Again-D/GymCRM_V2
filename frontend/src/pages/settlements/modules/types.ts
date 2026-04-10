import { startOfMonthLocalDate, todayLocalDate } from "../../../shared/date";

export type SettlementPaymentMethod = "" | "CASH" | "CARD" | "TRANSFER" | "ETC";
export type SettlementTabKey = "salesAnalytics" | "trainerPayroll";
export type SettlementTrendGranularity = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type SettlementAdjustmentType = "REFUND";
export type TrainerSettlementStatus = "DRAFT" | "CONFIRMED";
export type TrainerSettlementScope = "ALL" | string;
export type TrainerSettlementPresetKey = "thisMonth" | "lastMonth";
export const DEFAULT_TRAINER_PAYROLL_SESSION_UNIT_PRICE = 50000;

export type SettlementReportFilters = {
  startDate: string;
  endDate: string;
  paymentMethod: SettlementPaymentMethod;
  productKeyword: string;
  trendGranularity: SettlementTrendGranularity;
};

export type SettlementReportRow = {
  productName: string;
  paymentMethod: Exclude<SettlementPaymentMethod, "">;
  grossSales: number;
  refundAmount: number;
  netSales: number;
  transactionCount: number;
};

export type SettlementReport = {
  startDate: string;
  endDate: string;
  paymentMethod: Exclude<SettlementPaymentMethod, ""> | null;
  productKeyword: string | null;
  trendGranularity: SettlementTrendGranularity;
  totalGrossSales: number;
  totalRefundAmount: number;
  totalNetSales: number;
  trend: SettlementTrendPoint[];
  rows: SettlementReportRow[];
};

export type SettlementTrendPoint = {
  bucketStartDate: string;
  bucketLabel: string;
  grossSales: number;
  refundAmount: number;
  netSales: number;
  transactionCount: number;
};

export type SalesDashboard = {
  baseDate: string;
  expiringWithinDays: number;
  todayNetSales: number;
  monthNetSales: number;
  newMemberCount: number;
  expiringMemberCount: number;
  refundCount: number;
};

export type SettlementRecentAdjustment = {
  paymentId: number;
  adjustmentType: SettlementAdjustmentType;
  productName: string;
  memberName: string;
  paymentMethod: Exclude<SettlementPaymentMethod, "">;
  amount: number;
  paidAt: string;
  memo: string | null;
  approvalRef: string | null;
};

export type TrainerSettlementPreviewFilters = {
  trainerId: TrainerSettlementScope;
  settlementMonth: string;
};

export type TrainerSettlementPreviewQuery = TrainerSettlementPreviewFilters;

export type TrainerSettlementPreviewRow = {
  trainerUserId: number;
  trainerName: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  ptSessions: number;
  gxSessions: number;
  ptRatePerSession: number | null;
  gxRatePerSession: number | null;
  ptAmount: number | null;
  gxAmount: number | null;
  totalAmount: number | null;
  hasRateWarning: boolean;
  rateWarningMessage: string | null;
};

export type TrainerSettlementPreviewReport = {
  settlementMonth: string;
  scope: {
    trainerId: TrainerSettlementScope;
    trainerName: string;
  };
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    totalAmount: number | null;
    hasRateWarnings: boolean;
  };
  conflict: {
    hasConflict: boolean;
    createAllowed: boolean;
  };
  rows: TrainerSettlementPreviewRow[];
};

export type TrainerSettlementWorkspace = {
  settlementId: number;
  trainer: {
    trainerId: TrainerSettlementScope;
    name: string;
  };
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalSessions: number;
    completedSessions: number;
    cancelledSessions: number;
    noShowSessions: number;
    ptSessions: number;
    gxSessions: number;
  };
  calculation: {
    ptRatePerSession: number | null;
    gxRatePerSession: number | null;
    ptAmount: number | null;
    gxAmount: number | null;
    bonus: number;
    bonusReason: string | null;
    deduction: number;
    deductionReason: string | null;
    totalAmount: number;
  };
  status: TrainerSettlementStatus;
  createdAt: string;
  confirmedAt: string | null;
};

export type TrainerPayrollFilters = {
  settlementMonth: string;
  sessionUnitPrice: string;
};

export type TrainerPayrollQuery = {
  settlementMonth: string;
  sessionUnitPrice: number;
};

export type TrainerPayrollRow = {
  settlementId: number | null;
  trainerUserId: number | null;
  trainerName: string;
  completedClassCount: number;
  sessionUnitPrice: number;
  payrollAmount: number;
};

export type TrainerPayrollReport = {
  settlementMonth: string;
  sessionUnitPrice: number;
  totalCompletedClassCount: number;
  totalPayrollAmount: number;
  settlementStatus: TrainerSettlementStatus;
  confirmedAt: string | null;
  rows: TrainerPayrollRow[];
};

export type TrainerMonthlyPtSummary = {
  settlementMonth: string;
  trainerUserId: number;
  trainerName: string;
  completedClassCount: number;
};

export function createDefaultSettlementFilters(): SettlementReportFilters {
  const today = todayLocalDate();
  return {
    startDate: startOfMonthLocalDate(today),
    endDate: today,
    paymentMethod: "",
    productKeyword: "",
    trendGranularity: "DAILY"
  };
}

export function createDefaultTrainerSettlementPreviewFilters(baseDate = todayLocalDate()): TrainerSettlementPreviewFilters {
  return {
    trainerId: "ALL",
    settlementMonth: baseDate.slice(0, 7)
  };
}

export function createDefaultTrainerPayrollFilters(baseDate = todayLocalDate()): TrainerPayrollFilters {
  return {
    settlementMonth: baseDate.slice(0, 7),
    sessionUnitPrice: String(DEFAULT_TRAINER_PAYROLL_SESSION_UNIT_PRICE)
  };
}
