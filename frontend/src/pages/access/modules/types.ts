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
	memberName: string;
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

export type AccessAlertReasonCount = {
	denyReason: string;
	deniedCount: number;
};

export type AccessRepeatedDeniedMember = {
	memberId: number;
	memberName: string;
	deniedCount: number;
	lastDeniedAt: string;
};

export type AccessDeniedEvent = {
	accessEventId: number;
	memberId: number;
	memberName: string;
	denyReason: string;
	processedAt: string;
};

export type AccessAlertSummary = {
	windowFrom: string;
	windowTo: string;
	totalDeniedCount: number;
	requiresImmediateAttention: boolean;
	deniedReasonCounts: AccessAlertReasonCount[];
	repeatedDeniedMembers: AccessRepeatedDeniedMember[];
	recentDeniedEvents: AccessDeniedEvent[];
};
