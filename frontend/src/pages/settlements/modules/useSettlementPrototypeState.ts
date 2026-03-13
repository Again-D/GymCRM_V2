import { useState } from "react";

import { createDefaultSettlementFilters, type SettlementReportFilters } from "./types";

export function useSettlementPrototypeState() {
  const [settlementFilters, setSettlementFilters] = useState<SettlementReportFilters>(createDefaultSettlementFilters);
  const [settlementPanelMessage, setSettlementPanelMessage] = useState<string | null>(null);
  const [settlementPanelError, setSettlementPanelError] = useState<string | null>(null);

  function clearSettlementFeedback() {
    setSettlementPanelMessage(null);
    setSettlementPanelError(null);
  }

  function resetSettlementWorkspace() {
    setSettlementFilters(createDefaultSettlementFilters());
    clearSettlementFeedback();
  }

  return {
    settlementFilters,
    setSettlementFilters,
    settlementPanelMessage,
    setSettlementPanelMessage,
    settlementPanelError,
    setSettlementPanelError,
    clearSettlementFeedback,
    resetSettlementWorkspace
  } as const;
}
