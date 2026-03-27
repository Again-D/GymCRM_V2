export type TrainerAvailabilityRule = {
  availabilityRuleId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type TrainerAvailabilityExceptionType = "OFF" | "OVERRIDE";

export type TrainerAvailabilityException = {
  availabilityExceptionId: number;
  exceptionDate: string;
  exceptionType: TrainerAvailabilityExceptionType;
  overrideStartTime: string | null;
  overrideEndTime: string | null;
  memo: string | null;
};

export type TrainerAvailabilityStatus = "AVAILABLE" | "OFF" | "UNSET";

export type TrainerAvailabilityEffectiveDay = {
  date: string;
  source: "WEEKLY_RULE" | "EXCEPTION_OFF" | "EXCEPTION_OVERRIDE" | "NONE";
  availabilityStatus: TrainerAvailabilityStatus;
  startTime: string | null;
  endTime: string | null;
  memo: string | null;
};

export type TrainerAvailabilitySnapshot = {
  trainerUserId: number;
  month: string;
  weeklyRules: TrainerAvailabilityRule[];
  exceptions: TrainerAvailabilityException[];
  effectiveDays: TrainerAvailabilityEffectiveDay[];
};

export type TrainerAvailabilityScope =
  | { type: "me"; userId: number }
  | { type: "trainer"; trainerUserId: number };

export type WeeklyRuleDraft = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
};

export type ExceptionDraftMode = "DEFAULT" | "OFF" | "OVERRIDE";

export type ExceptionDraft = {
  mode: ExceptionDraftMode;
  overrideStartTime: string;
  overrideEndTime: string;
  memo: string;
};

const defaultWeeklyTime = {
  startTime: "09:00",
  endTime: "18:00",
} as const;

export const WEEKDAY_LABELS = [
  "월",
  "화",
  "수",
  "목",
  "금",
  "토",
  "일",
] as const;

export function createDefaultWeeklyRuleDrafts(): WeeklyRuleDraft[] {
  return Array.from({ length: 7 }, (_, index) => ({
    dayOfWeek: index + 1,
    enabled: false,
    startTime: defaultWeeklyTime.startTime,
    endTime: defaultWeeklyTime.endTime,
  }));
}

export function createWeeklyRuleDraftsFromSnapshot(
  snapshot: TrainerAvailabilitySnapshot | null,
) {
  const base = createDefaultWeeklyRuleDrafts();
  if (!snapshot) {
    return base;
  }
  const ruleByDay = new Map(snapshot.weeklyRules.map((rule) => [rule.dayOfWeek, rule]));
  return base.map((draft) => {
    const rule = ruleByDay.get(draft.dayOfWeek);
    if (!rule) {
      return draft;
    }
    return {
      dayOfWeek: draft.dayOfWeek,
      enabled: true,
      startTime: rule.startTime.slice(0, 5),
      endTime: rule.endTime.slice(0, 5),
    };
  });
}

export function buildWeeklyRulesPayload(drafts: WeeklyRuleDraft[]) {
  return drafts
    .filter((draft) => draft.enabled)
    .map((draft) => ({
      dayOfWeek: draft.dayOfWeek,
      startTime: draft.startTime,
      endTime: draft.endTime,
    }));
}

export function createExceptionDraftForDate(
  snapshot: TrainerAvailabilitySnapshot | null,
  date: string,
): ExceptionDraft {
  const exception = snapshot?.exceptions.find((item) => item.exceptionDate === date);
  if (!exception) {
    return {
      mode: "DEFAULT",
      overrideStartTime: defaultWeeklyTime.startTime,
      overrideEndTime: defaultWeeklyTime.endTime,
      memo: "",
    };
  }
  if (exception.exceptionType === "OFF") {
    return {
      mode: "OFF",
      overrideStartTime: defaultWeeklyTime.startTime,
      overrideEndTime: defaultWeeklyTime.endTime,
      memo: exception.memo ?? "",
    };
  }
  return {
    mode: "OVERRIDE",
    overrideStartTime: exception.overrideStartTime?.slice(0, 5) ?? defaultWeeklyTime.startTime,
    overrideEndTime: exception.overrideEndTime?.slice(0, 5) ?? defaultWeeklyTime.endTime,
    memo: exception.memo ?? "",
  };
}

export function getCurrentMonthValue() {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

export function getWeekdayLabel(dayOfWeek: number) {
  return WEEKDAY_LABELS[dayOfWeek - 1] ?? "";
}

export function getAvailabilityStatusLabel(status: TrainerAvailabilityStatus) {
  switch (status) {
    case "AVAILABLE":
      return "가능";
    case "OFF":
      return "휴무";
    default:
      return "미설정";
  }
}

export function formatAvailabilityTimeRange(
  startTime: string | null,
  endTime: string | null,
) {
  if (!startTime || !endTime) {
    return "시간 없음";
  }
  return `${startTime.slice(0, 5)} - ${endTime.slice(0, 5)}`;
}
