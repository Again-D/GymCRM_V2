import { useState } from "react";

import { invalidateQueryDomains } from "../../../api/queryInvalidation";
import { processMockCrmQueue, triggerMockCrmExpiryReminder } from "../../../api/mockData";
import { createDefaultCrmFilters } from "./types";

export function useCrmPrototypeState() {
  const [crmFilters, setCrmFilters] = useState(createDefaultCrmFilters);
  const [crmTriggerDaysAhead, setCrmTriggerDaysAhead] = useState("3");
  const [crmTriggerSubmitting, setCrmTriggerSubmitting] = useState(false);
  const [crmProcessSubmitting, setCrmProcessSubmitting] = useState(false);
  const [crmPanelMessage, setCrmPanelMessage] = useState<string | null>(null);
  const [crmPanelError, setCrmPanelError] = useState<string | null>(null);

  function clearCrmFeedback() {
    setCrmPanelMessage(null);
    setCrmPanelError(null);
  }

  async function triggerCrmExpiryReminder() {
    clearCrmFeedback();
    const daysAhead = Number.parseInt(crmTriggerDaysAhead, 10);
    if (!Number.isFinite(daysAhead) || daysAhead < 0) {
      setCrmPanelError("daysAhead는 0 이상의 숫자여야 합니다.");
      return false;
    }

    setCrmTriggerSubmitting(true);
    try {
      const result = triggerMockCrmExpiryReminder(daysAhead);
      invalidateQueryDomains(["crmHistory", "crmQueue"]);
      setCrmPanelMessage(result.message);
      return true;
    } finally {
      setCrmTriggerSubmitting(false);
    }
  }

  async function processCrmQueue() {
    clearCrmFeedback();
    setCrmProcessSubmitting(true);
    try {
      const result = processMockCrmQueue();
      invalidateQueryDomains(["crmHistory", "crmQueue"]);
      setCrmPanelMessage(result.message);
      return true;
    } finally {
      setCrmProcessSubmitting(false);
    }
  }

  function resetCrmWorkspace() {
    setCrmFilters(createDefaultCrmFilters());
    setCrmTriggerDaysAhead("3");
    setCrmTriggerSubmitting(false);
    setCrmProcessSubmitting(false);
    clearCrmFeedback();
  }

  return {
    crmFilters,
    setCrmFilters,
    crmTriggerDaysAhead,
    setCrmTriggerDaysAhead,
    crmTriggerSubmitting,
    crmProcessSubmitting,
    crmPanelMessage,
    crmPanelError,
    clearCrmFeedback,
    triggerCrmExpiryReminder,
    processCrmQueue,
    resetCrmWorkspace
  } as const;
}
