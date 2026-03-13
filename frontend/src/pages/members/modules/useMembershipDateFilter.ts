import { useState } from "react";

import { addMonthsToLocalDate, addDaysToLocalDate, formatLocalDate } from "../../../shared/date";

export type MembershipPeriodPreset = "" | "1w" | "1m" | "3m" | "6m";

export type MembershipDateFilterState = {
  presetRange: MembershipPeriodPreset;
  dateFrom: string;
  dateTo: string;
};

function addPresetDuration(dateText: string, preset: Exclude<MembershipPeriodPreset, "">) {
  if (preset === "1w") {
    return addDaysToLocalDate(dateText, 7);
  }
  if (preset === "1m") {
    return addMonthsToLocalDate(dateText, 1);
  }
  if (preset === "3m") {
    return addMonthsToLocalDate(dateText, 3);
  }
  return addMonthsToLocalDate(dateText, 6);
}

export function useMembershipDateFilter() {
  const [dateFilter, setDateFilter] = useState<MembershipDateFilterState>({
    presetRange: "",
    dateFrom: "",
    dateTo: ""
  });

  function applyPreset(preset: MembershipPeriodPreset) {
    if (!preset) {
      setDateFilter((prev) => ({ ...prev, presetRange: "" }));
      return;
    }

    const today = new Date();
    const todayText = formatLocalDate(today);
    setDateFilter({
      presetRange: preset,
      dateFrom: todayText,
      dateTo: addPresetDuration(todayText, preset)
    });
  }

  function setDateFrom(value: string) {
    setDateFilter((prev) => ({ ...prev, presetRange: "", dateFrom: value }));
  }

  function setDateTo(value: string) {
    setDateFilter((prev) => ({ ...prev, presetRange: "", dateTo: value }));
  }

  function reset() {
    setDateFilter({
      presetRange: "",
      dateFrom: "",
      dateTo: ""
    });
  }

  return {
    dateFilter,
    applyPreset,
    setDateFrom,
    setDateTo,
    reset
  } as const;
}
