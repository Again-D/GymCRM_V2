export type AccessPresenceRow = {
  accessSessionId: number;
  memberId: number;
  memberName: string;
  phone: string;
  membershipId: number | null;
  reservationId: number | null;
  entryAt: string;
};

export type AccessEventRow = {
  accessEventId: number;
  memberId: number;
  membershipId: number | null;
  reservationId: number | null;
  eventType: "ENTRY_GRANTED" | "EXIT" | "ENTRY_DENIED";
  denyReason: string | null;
  processedAt: string;
};

export type AccessPresenceSummary = {
  openSessionCount: number;
  todayEntryGrantedCount: number;
  todayExitCount: number;
  todayEntryDeniedCount: number;
  openSessions: AccessPresenceRow[];
};
