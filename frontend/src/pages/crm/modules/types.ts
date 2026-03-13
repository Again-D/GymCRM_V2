export type CrmSendStatus = "PENDING" | "RETRY_WAIT" | "SENT" | "DEAD";

export type CrmHistoryRow = {
  crmMessageEventId: number;
  memberId: number;
  membershipId: number | null;
  eventType: string;
  channelType: string;
  sendStatus: CrmSendStatus;
  attemptCount: number;
  lastAttemptedAt: string | null;
  nextAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  lastErrorMessage: string | null;
  traceId: string | null;
  createdAt: string;
};

export type CrmFilters = {
  sendStatus: "" | CrmSendStatus;
  limit: string;
};

export function createDefaultCrmFilters(): CrmFilters {
  return {
    sendStatus: "",
    limit: "100"
  };
}
