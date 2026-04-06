import { useCallback, useState } from "react";

import {
  createDefaultTrainerPayrollFilters,
  type TrainerPayrollFilters,
  type TrainerPayrollQuery
} from "./types";

function isValidSettlementMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

export function useTrainerPayrollPrototypeState(baseDate?: string) {
  const [trainerPayrollFilters, setTrainerPayrollFilters] = useState<TrainerPayrollFilters>(() =>
    createDefaultTrainerPayrollFilters(baseDate)
  );
  const [submittedTrainerPayrollQuery, setSubmittedTrainerPayrollQuery] = useState<TrainerPayrollQuery | null>(null);
  const [trainerPayrollPanelMessage, setTrainerPayrollPanelMessage] = useState<string | null>(null);
  const [trainerPayrollPanelError, setTrainerPayrollPanelError] = useState<string | null>(null);

  const clearTrainerPayrollFeedback = useCallback(() => {
    setTrainerPayrollPanelMessage(null);
    setTrainerPayrollPanelError(null);
  }, []);

  const submitTrainerPayrollFilters = useCallback(() => {
    const settlementMonth = trainerPayrollFilters.settlementMonth.trim();
    const sessionUnitPrice = Number(trainerPayrollFilters.sessionUnitPrice.trim());

    clearTrainerPayrollFeedback();

    if (!isValidSettlementMonth(settlementMonth)) {
      setTrainerPayrollPanelError("정산 월은 YYYY-MM 형식으로 입력해야 합니다.");
      return null;
    }
    if (!Number.isFinite(sessionUnitPrice) || sessionUnitPrice < 0) {
      setTrainerPayrollPanelError("세션 단가는 0 이상이어야 합니다.");
      return null;
    }

    const nextQuery = {
      settlementMonth,
      sessionUnitPrice
    } satisfies TrainerPayrollQuery;

    setSubmittedTrainerPayrollQuery(nextQuery);
    return nextQuery;
  }, [clearTrainerPayrollFeedback, trainerPayrollFilters.sessionUnitPrice, trainerPayrollFilters.settlementMonth]);

  const resetTrainerPayrollWorkspace = useCallback(() => {
    setTrainerPayrollFilters(createDefaultTrainerPayrollFilters(baseDate));
    setSubmittedTrainerPayrollQuery(null);
    clearTrainerPayrollFeedback();
  }, [baseDate, clearTrainerPayrollFeedback]);

  return {
    trainerPayrollFilters,
    setTrainerPayrollFilters,
    submittedTrainerPayrollQuery,
    trainerPayrollPanelMessage,
    setTrainerPayrollPanelMessage,
    trainerPayrollPanelError,
    setTrainerPayrollPanelError,
    clearTrainerPayrollFeedback,
    submitTrainerPayrollFilters,
    resetTrainerPayrollWorkspace
  } as const;
}
