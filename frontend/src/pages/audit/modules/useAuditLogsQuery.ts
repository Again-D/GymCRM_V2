import { useQuery } from "@tanstack/react-query";
import { apiGet } from "../../../api/client";
import type { AuditLogListResponse } from "./types";

export function useAuditLogsQuery(filters: { eventType?: string }) {
	const { eventType } = filters;

	const queryParams = new URLSearchParams();
	if (eventType) {
		queryParams.append("eventType", eventType);
	}
	queryParams.append("limit", "100");

	const path = `/api/v1/audit-logs?${queryParams.toString()}`;

	return useQuery({
		queryKey: ["audit-logs", filters],
		queryFn: async () => {
			const response = await apiGet<AuditLogListResponse>(path);
			return response.data;
		},
	});
}
