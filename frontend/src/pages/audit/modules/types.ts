export interface AuditLog {
	auditLogId: number;
	centerId: number;
	eventType: string;
	actorUserId: number;
	resourceType: string;
	resourceId: string;
	eventAt: string;
	traceId: string;
	attributesJson: string;
	createdAt: string;
}

export interface AuditLogListResponse {
	rows: AuditLog[];
}
