export type GxScheduleRule = {
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

export type GxScheduleExceptionType = "OFF" | "OVERRIDE";

export type GxScheduleException = {
  exceptionId: number;
  ruleId: number;
  exceptionDate: string;
  exceptionType: GxScheduleExceptionType;
  overrideTrainerUserId: number | null;
  overrideStartTime: string | null;
  overrideEndTime: string | null;
  overrideCapacity: number | null;
  memo: string | null;
};

export type GxGeneratedSchedule = {
  scheduleId: number;
  sourceRuleId: number | null;
  sourceExceptionId: number | null;
  trainerUserId: number | null;
  trainerName: string;
  className: string;
  startAt: string;
  endAt: string;
  capacity: number;
  currentCount: number;
};

export type GxScheduleSnapshot = {
  month: string;
  rules: GxScheduleRule[];
  exceptions: GxScheduleException[];
  generatedSchedules: GxGeneratedSchedule[];
};

export type GxScheduleRuleForm = {
  className: string;
  trainerUserId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: string;
  effectiveStartDate: string;
  active: boolean;
};

export type GxScheduleExceptionForm = {
  exceptionType: GxScheduleExceptionType;
  overrideTrainerUserId: string;
  overrideStartTime: string;
  overrideEndTime: string;
  overrideCapacity: string;
  memo: string;
};

export const WEEKDAY_OPTIONS = [
  { value: "1", label: "월" },
  { value: "2", label: "화" },
  { value: "3", label: "수" },
  { value: "4", label: "목" },
  { value: "5", label: "금" },
  { value: "6", label: "토" },
  { value: "7", label: "일" },
] as const;

export function getCurrentMonthValue() {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

export function getCurrentDateValue() {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export function createEmptyRuleForm(): GxScheduleRuleForm {
  return {
    className: "",
    trainerUserId: "",
    dayOfWeek: "1",
    startTime: "09:00",
    endTime: "10:00",
    capacity: "10",
    effectiveStartDate: getCurrentDateValue(),
    active: true,
  };
}

export function createRuleFormFromRule(rule: GxScheduleRule): GxScheduleRuleForm {
  return {
    className: rule.className,
    trainerUserId: String(rule.trainerUserId),
    dayOfWeek: String(rule.dayOfWeek),
    startTime: rule.startTime.slice(0, 5),
    endTime: rule.endTime.slice(0, 5),
    capacity: String(rule.capacity),
    effectiveStartDate: rule.effectiveStartDate,
    active: rule.active,
  };
}

export function createExceptionForm(
  exception: GxScheduleException | null | undefined,
  fallbackTrainerUserId: number | null | undefined,
  fallbackCapacity: number | null | undefined,
): GxScheduleExceptionForm {
  if (!exception) {
    return {
      exceptionType: "OFF",
      overrideTrainerUserId:
        fallbackTrainerUserId == null ? "" : String(fallbackTrainerUserId),
      overrideStartTime: "09:00",
      overrideEndTime: "10:00",
      overrideCapacity: fallbackCapacity == null ? "" : String(fallbackCapacity),
      memo: "",
    };
  }
  return {
    exceptionType: exception.exceptionType,
    overrideTrainerUserId:
      exception.overrideTrainerUserId == null
        ? fallbackTrainerUserId == null
          ? ""
          : String(fallbackTrainerUserId)
        : String(exception.overrideTrainerUserId),
    overrideStartTime: exception.overrideStartTime?.slice(0, 5) ?? "09:00",
    overrideEndTime: exception.overrideEndTime?.slice(0, 5) ?? "10:00",
    overrideCapacity:
      exception.overrideCapacity == null
        ? fallbackCapacity == null
          ? ""
          : String(fallbackCapacity)
        : String(exception.overrideCapacity),
    memo: exception.memo ?? "",
  };
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
