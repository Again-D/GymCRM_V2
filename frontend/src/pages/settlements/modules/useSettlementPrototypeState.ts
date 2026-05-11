import { useCallback, useState } from "react";

import {
  createDefaultSettlementFilters,
  createDefaultSettlementReceivablesFilters,
  type SettlementReceivablesFilters,
  type SettlementReportFilters
} from "./types";

export function useSettlementPrototypeState() {
  const [settlementFilters, setSettlementFilters] = useState<SettlementReportFilters>(createDefaultSettlementFilters);
  const [settlementReceivablesFilters, setSettlementReceivablesFilters] = useState<SettlementReceivablesFilters>(
    createDefaultSettlementReceivablesFilters
  );
  const [settlementPanelMessage, setSettlementPanelMessage] = useState<string | null>(null);
  const [settlementPanelError, setSettlementPanelError] = useState<string | null>(null);

  const clearSettlementFeedback = useCallback(() => {
    setSettlementPanelMessage(null);
    setSettlementPanelError(null);
  }, []);

  const resetSettlementWorkspace = useCallback(() => {
    setSettlementFilters(createDefaultSettlementFilters());
    setSettlementReceivablesFilters(createDefaultSettlementReceivablesFilters());
    clearSettlementFeedback();
  }, [clearSettlementFeedback]);

  return {
    settlementFilters,
    setSettlementFilters,
    settlementReceivablesFilters,
    setSettlementReceivablesFilters,
    settlementPanelMessage,
    setSettlementPanelMessage,
    settlementPanelError,
    setSettlementPanelError,
    clearSettlementFeedback,
    resetSettlementWorkspace
  } as const;
}
