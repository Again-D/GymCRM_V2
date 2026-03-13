import { useState } from "react";

export type MembershipPeriodPreset = "" | "1w" | "1m" | "3m" | "6m";

export type MembershipDateFilterState = {
  presetRange: MembershipPeriodPreset;
  dateFrom: string;
  dateTo: string;
};

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addPresetDuration(base: Date, preset: Exclude<MembershipPeriodPreset, "">) {
  const next = new Date(base);
  if (preset === "1w") {
    next.setDate(next.getDate() + 7);
    return next;
  }
  if (preset === "1m") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  if (preset === "3m") {
    next.setMonth(next.getMonth() + 3);
    return next;
  }
  next.setMonth(next.getMonth() + 6);
  return next;
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
    setDateFilter({
      presetRange: preset,
      dateFrom: formatDate(today),
      dateTo: formatDate(addPresetDuration(today, preset))
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
