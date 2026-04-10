import { useCallback, useState } from "react";

import {
  createDefaultTrainerSettlementPreviewFilters,
  type TrainerSettlementPresetKey,
  type TrainerSettlementPreviewFilters,
  type TrainerSettlementPreviewQuery,
  type TrainerSettlementWorkspace
} from "./types";
import { addMonthsToLocalDate, todayLocalDate } from "../../../shared/date";

function normalizeFilters(filters: TrainerSettlementPreviewFilters) {
  return {
    trainerId: filters.trainerId.trim() || "ALL",
    settlementMonth: filters.settlementMonth.trim()
  } satisfies TrainerSettlementPreviewFilters;
}

function isValidSettlementMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }
  const [yearText, monthText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const parsed = new Date(year, month - 1, 1);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && month >= 1
    && month <= 12;
}

function createPresetMonth(preset: TrainerSettlementPresetKey, baseDate = todayLocalDate()) {
  if (preset === "lastMonth") {
    return { settlementMonth: addMonthsToLocalDate(baseDate, -1).slice(0, 7) };
  }
  return {
    settlementMonth: baseDate.slice(0, 7)
  };
}

export function useTrainerSettlementWorkspaceState(baseDate = todayLocalDate(), initialTrainerId: string = "ALL") {
  const [trainerSettlementFilters, setTrainerSettlementFiltersState] = useState<TrainerSettlementPreviewFilters>(() => ({
    ...createDefaultTrainerSettlementPreviewFilters(baseDate),
    trainerId: initialTrainerId
  }));
  const [submittedTrainerSettlementQuery, setSubmittedTrainerSettlementQuery] = useState<TrainerSettlementPreviewQuery | null>(null);
  const [activeSettlement, setActiveSettlement] = useState<TrainerSettlementWorkspace | null>(null);
  const [trainerSettlementPanelMessage, setTrainerSettlementPanelMessage] = useState<string | null>(null);
  const [trainerSettlementPanelError, setTrainerSettlementPanelError] = useState<string | null>(null);

  const clearTrainerSettlementFeedback = useCallback(() => {
    setTrainerSettlementPanelMessage(null);
    setTrainerSettlementPanelError(null);
  }, []);

  const setTrainerSettlementFilters = useCallback((
    next:
      | TrainerSettlementPreviewFilters
      | ((prev: TrainerSettlementPreviewFilters) => TrainerSettlementPreviewFilters)
  ) => {
    setTrainerSettlementFiltersState((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      const normalized = normalizeFilters(resolved);
      if (
        normalized.trainerId !== prev.trainerId ||
        normalized.settlementMonth !== prev.settlementMonth
      ) {
        setActiveSettlement(null);
      }
      return normalized;
    });
  }, []);

  const submitTrainerSettlementFilters = useCallback(() => {
    const normalized = normalizeFilters(trainerSettlementFilters);

    clearTrainerSettlementFeedback();

    if (!isValidSettlementMonth(normalized.settlementMonth)) {
      setTrainerSettlementPanelError("정산 월은 YYYY-MM 형식으로 입력해야 합니다.");
      return null;
    }

    setSubmittedTrainerSettlementQuery(normalized);
    return normalized;
  }, [clearTrainerSettlementFeedback, trainerSettlementFilters]);

  const applyTrainerSettlementPreset = useCallback((preset: TrainerSettlementPresetKey) => {
    const nextMonth = createPresetMonth(preset, baseDate);
    setTrainerSettlementFilters((prev) => ({
      ...prev,
      ...nextMonth
    }));
  }, [baseDate, setTrainerSettlementFilters]);

  const syncCreatedSettlement = useCallback((nextSettlement: Omit<TrainerSettlementWorkspace, "confirmedAt"> & { confirmedAt?: string | null }) => {
    setActiveSettlement({
      ...nextSettlement,
      confirmedAt: nextSettlement.confirmedAt ?? null
    });
  }, []);

  const markSettlementConfirmed = useCallback((confirmedAt: string) => {
    setActiveSettlement((prev) => prev ? {
      ...prev,
      status: "CONFIRMED",
      confirmedAt
    } : prev);
  }, []);

  const resetTrainerSettlementWorkspace = useCallback(() => {
    setTrainerSettlementFiltersState({
      ...createDefaultTrainerSettlementPreviewFilters(baseDate),
      trainerId: initialTrainerId
    });
    setSubmittedTrainerSettlementQuery(null);
    setActiveSettlement(null);
    clearTrainerSettlementFeedback();
  }, [baseDate, clearTrainerSettlementFeedback, initialTrainerId]);

  return {
    trainerSettlementFilters,
    setTrainerSettlementFilters,
    submittedTrainerSettlementQuery,
    trainerSettlementPanelMessage,
    setTrainerSettlementPanelMessage,
    trainerSettlementPanelError,
    setTrainerSettlementPanelError,
    clearTrainerSettlementFeedback,
    submitTrainerSettlementFilters,
    applyTrainerSettlementPreset,
    activeSettlement,
    syncCreatedSettlement,
    markSettlementConfirmed,
    resetTrainerSettlementWorkspace
  } as const;
}
