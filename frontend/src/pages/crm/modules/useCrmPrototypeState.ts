import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys } from "../../../app/queryHelpers";
import { createDefaultCrmFilters } from "./types";

export function useCrmPrototypeState() {
  const queryClient = useQueryClient();
  const [crmFilters, setCrmFilters] = useState(createDefaultCrmFilters());
  const [crmTriggerDaysAhead, setCrmTriggerDaysAhead] = useState("3");
  const [crmTriggerSubmitting, setCrmTriggerSubmitting] = useState(false);
  const [crmProcessSubmitting, setCrmProcessSubmitting] = useState(false);
  const [crmPanelMessage, setCrmPanelMessage] = useState<string | null>(null);
  const [crmPanelError, setCrmPanelError] = useState<string | null>(null);
  const useMockMutations = isMockApiMode();

  const clearCrmFeedback = useCallback(() => {
    setCrmPanelMessage(null);
    setCrmPanelError(null);
  }, []);

  const invalidateCrm = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.crm.all });
  };

  async function triggerCrmExpiryReminder() {
    clearCrmFeedback();
    const daysAhead = Number.parseInt(crmTriggerDaysAhead, 10);
    if (!Number.isFinite(daysAhead) || daysAhead < 0) {
      setCrmPanelError("daysAhead는 0 이상의 숫자여야 합니다.");
      return false;
    }

    setCrmTriggerSubmitting(true);
    try {
      const result = useMockMutations
        ? await import("../../../api/mockData").then(
            ({ triggerMockCrmExpiryReminder }) =>
              triggerMockCrmExpiryReminder(daysAhead),
          )
        : await apiPost(
            "/api/v1/crm/messages/triggers/membership-expiry-reminder",
            {
              daysAhead,
            },
          );
      await invalidateCrm();
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
      const result = useMockMutations
        ? await import("../../../api/mockData").then(
            ({ processMockCrmQueue }) => processMockCrmQueue(),
          )
        : await apiPost("/api/v1/crm/messages/process", {
            limit: 100,
          });
      await invalidateCrm();
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
    resetCrmWorkspace,
  } as const;
}
