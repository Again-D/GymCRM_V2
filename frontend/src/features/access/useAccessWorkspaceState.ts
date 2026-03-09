import { useState } from "react";

export type AccessEventRecord = {
  accessEventId: number;
  centerId: number;
  memberId: number;
  membershipId: number | null;
  reservationId: number | null;
  processedBy: number;
  eventType: "ENTRY_GRANTED" | "EXIT" | "ENTRY_DENIED";
  denyReason: string | null;
  processedAt: string;
};

export type AccessOpenSession = {
  accessSessionId: number;
  memberId: number;
  memberName: string;
  phone: string;
  membershipId: number | null;
  reservationId: number | null;
  entryAt: string;
};

export type AccessPresenceSummary = {
  openSessionCount: number;
  todayEntryGrantedCount: number;
  todayExitCount: number;
  todayEntryDeniedCount: number;
  openSessions: AccessOpenSession[];
};

export function useAccessWorkspaceState() {
  const [accessMemberQuery, setAccessMemberQuery] = useState("");
  const [accessSelectedMemberId, setAccessSelectedMemberId] = useState<number | null>(null);
  const [accessEvents, setAccessEvents] = useState<AccessEventRecord[]>([]);
  const [accessPresence, setAccessPresence] = useState<AccessPresenceSummary | null>(null);
  const [accessEventsLoading, setAccessEventsLoading] = useState(false);
  const [accessPresenceLoading, setAccessPresenceLoading] = useState(false);
  const [accessActionSubmitting, setAccessActionSubmitting] = useState(false);
  const [accessPanelMessage, setAccessPanelMessage] = useState<string | null>(null);
  const [accessPanelError, setAccessPanelError] = useState<string | null>(null);

  function resetAccessWorkspace() {
    setAccessMemberQuery("");
    setAccessSelectedMemberId(null);
    setAccessEvents([]);
    setAccessPresence(null);
    setAccessEventsLoading(false);
    setAccessPresenceLoading(false);
    setAccessActionSubmitting(false);
    setAccessPanelMessage(null);
    setAccessPanelError(null);
  }

  return {
    accessMemberQuery,
    setAccessMemberQuery,
    accessSelectedMemberId,
    setAccessSelectedMemberId,
    accessEvents,
    setAccessEvents,
    accessPresence,
    setAccessPresence,
    accessEventsLoading,
    setAccessEventsLoading,
    accessPresenceLoading,
    setAccessPresenceLoading,
    accessActionSubmitting,
    setAccessActionSubmitting,
    accessPanelMessage,
    setAccessPanelMessage,
    accessPanelError,
    setAccessPanelError,
    resetAccessWorkspace
  };
}
