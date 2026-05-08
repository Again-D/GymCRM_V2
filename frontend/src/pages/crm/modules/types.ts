export type CrmSendStatus = "PENDING" | "RETRY_WAIT" | "SENT" | "DEAD";

export type CrmTemplateReviewStatus = "APPROVED" | "REJECTED";
export type CrmTemplateOperationalStatus = "SENDABLE" | "GOVERNANCE_ONLY";

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

export type CrmTemplateRow = {
  templateId: number;
  templateCode: string;
  templateName: string;
  channelType: string;
  templateType: string;
  templateBody: string;
  reviewStatus: CrmTemplateReviewStatus;
  operationalStatus: CrmTemplateOperationalStatus;
  sendable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmFilters = {
  sendStatus: "" | CrmSendStatus;
  limit: string;
};

export type CrmTemplateFilters = {
  channelType: "" | "SMS" | "KAKAO" | "EMAIL";
  activeOnly: boolean;
  limit: string;
};

export function createDefaultCrmFilters(): CrmFilters {
  return {
    sendStatus: "",
    limit: "100"
  };
}

export function createDefaultCrmTemplateFilters(): CrmTemplateFilters {
  return {
    channelType: "",
    activeOnly: false,
    limit: "50"
  };
}
