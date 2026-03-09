import { useState } from "react";

export type CrmMessageHistoryRow = {
  crmMessageEventId: number;
  memberId: number;
  membershipId: number | null;
  eventType: string;
  channelType: string;
  sendStatus: "PENDING" | "RETRY_WAIT" | "SENT" | "DEAD";
  attemptCount: number;
  lastAttemptedAt: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  lastErrorMessage: string | null;
  traceId: string | null;
  createdAt: string;
};

export type CrmMessageHistoryResponse = {
  rows: CrmMessageHistoryRow[];
};

export type CrmFilters = {
  sendStatus: "" | "PENDING" | "RETRY_WAIT" | "SENT" | "DEAD";
  limit: string;
};

export type CrmTriggerResponse = {
  baseDate: string;
  targetDate: string;
  totalTargets: number;
  createdCount: number;
  duplicatedCount: number;
};

export type CrmProcessResponse = {
  pickedCount: number;
  sentCount: number;
  retryWaitCount: number;
  deadCount: number;
  maxAttempts: number;
};

export function createInitialCrmFilters(): CrmFilters {
  return {
    sendStatus: "",
    limit: "100"
  };
}

export function useCrmWorkspaceState() {
  const [crmFilters, setCrmFilters] = useState<CrmFilters>(createInitialCrmFilters);
  const [crmTriggerDaysAhead, setCrmTriggerDaysAhead] = useState("3");
  const [crmTriggerSubmitting, setCrmTriggerSubmitting] = useState(false);
  const [crmProcessSubmitting, setCrmProcessSubmitting] = useState(false);
  const [crmPanelMessage, setCrmPanelMessage] = useState<string | null>(null);
  const [crmPanelError, setCrmPanelError] = useState<string | null>(null);

  function resetCrmWorkspace() {
    setCrmFilters(createInitialCrmFilters());
    setCrmTriggerDaysAhead("3");
    setCrmTriggerSubmitting(false);
    setCrmProcessSubmitting(false);
    setCrmPanelMessage(null);
    setCrmPanelError(null);
  }

  return {
    crmFilters,
    setCrmFilters,
    crmTriggerDaysAhead,
    setCrmTriggerDaysAhead,
    crmTriggerSubmitting,
    setCrmTriggerSubmitting,
    crmProcessSubmitting,
    setCrmProcessSubmitting,
    crmPanelMessage,
    setCrmPanelMessage,
    crmPanelError,
    setCrmPanelError,
    resetCrmWorkspace
  };
}
