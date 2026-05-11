import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { apiPost, isMockApiMode } from "../../../api/client";
import { queryKeys } from "../../../app/queryHelpers";
import {
	type CrmLongTermInactiveCampaignRequest,
	createDefaultCrmFilters,
	createDefaultCrmTemplateFilters,
} from "./types";

export function useCrmPrototypeState() {
	const queryClient = useQueryClient();
	const [crmFilters, setCrmFilters] = useState(createDefaultCrmFilters());
	const [crmTriggerDaysAhead, setCrmTriggerDaysAhead] = useState("3");
	const [crmTriggerScheduledAt, setCrmTriggerScheduledAt] = useState("");
	const [crmTriggerSubmitting, setCrmTriggerSubmitting] = useState(false);
	const [crmInactiveSubmitting, setCrmInactiveSubmitting] = useState(false);
	const [crmProcessSubmitting, setCrmProcessSubmitting] = useState(false);
	const [crmPanelMessage, setCrmPanelMessage] = useState<string | null>(null);
	const [crmPanelError, setCrmPanelError] = useState<string | null>(null);
	const [crmTemplateFilters, setCrmTemplateFilters] = useState(
		createDefaultCrmTemplateFilters(),
	);
	const [crmSelectedTemplateId, setCrmSelectedTemplateId] = useState<
		number | null
	>(null);
	const [crmInactiveDays, setCrmInactiveDays] = useState("30");
	const [crmInactiveScheduledAt, setCrmInactiveScheduledAt] = useState("");
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
			const payload = {
				daysAhead,
				scheduledAt: crmTriggerScheduledAt || undefined,
			};
			const result = useMockMutations
				? await import("../../../api/mockData").then(
						({ triggerMockCrmExpiryReminder }) =>
							triggerMockCrmExpiryReminder(daysAhead),
					)
				: await apiPost(
						"/api/v1/crm/messages/triggers/membership-expiry-reminder",
						payload,
					);
			await invalidateCrm();
			setCrmPanelMessage(result.message);
			return true;
		} catch (e: any) {
			setCrmPanelError(e?.message || "작업 중 오류가 발생했습니다.");
			return false;
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
		} catch (e: any) {
			setCrmPanelError(e?.message || "작업 중 오류가 발생했습니다.");
			return false;
		} finally {
			setCrmProcessSubmitting(false);
		}
	}

	async function triggerCrmInactiveMemberCampaign() {
		clearCrmFeedback();
		const inactiveDays = Number.parseInt(crmInactiveDays, 10);
		if (!Number.isFinite(inactiveDays) || inactiveDays < 0) {
			setCrmPanelError("inactiveDays는 0 이상의 숫자여야 합니다.");
			return false;
		}

		setCrmInactiveSubmitting(true);
		try {
			const result = useMockMutations
				? await import("../../../api/mockData").then(
						({ triggerMockCrmInactiveMemberCampaign }) =>
							triggerMockCrmInactiveMemberCampaign(inactiveDays),
					)
				: await apiPost(
						"/api/v1/crm/messages/triggers/inactive-member-campaign",
						{
							inactiveDays,
						},
					);
			await invalidateCrm();
			setCrmPanelMessage(result.message);
			return true;
		} catch (e: any) {
			setCrmPanelError(e?.message || "작업 중 오류가 발생했습니다.");
			return false;
		} finally {
			setCrmInactiveSubmitting(false);
		}
	}

	async function triggerCrmLongTermInactiveCampaign(
		request: CrmLongTermInactiveCampaignRequest,
	) {
		clearCrmFeedback();

		if (
			!request.templateId ||
			!Number.isFinite(Number.parseInt(request.inactiveDays, 10)) ||
			Number.parseInt(request.inactiveDays, 10) < 1
		) {
			setCrmPanelError("장기 미방문 일수는 1 이상의 숫자여야 합니다.");
			return false;
		}

		setCrmInactiveSubmitting(true);
		try {
			const payload = {
				templateId: request.templateId,
				inactiveDays: Number.parseInt(request.inactiveDays, 10),
				scheduledAt: request.scheduledAt || null,
			};
			const result = useMockMutations
				? await import("../../../api/mockData").then(
						({ triggerMockCrmLongTermInactiveCampaign }) =>
							triggerMockCrmLongTermInactiveCampaign(payload),
					)
				: await apiPost(
						"/api/v1/crm/messages/triggers/long-term-inactive",
						payload,
					);
			if (
				result &&
				typeof result === "object" &&
				"ok" in result &&
				result.ok === false
			) {
				setCrmPanelError(
					(result as { message?: string }).message ??
						"장기 미방문 캠페인을 적재하지 못했습니다.",
				);
				return false;
			}
			await invalidateCrm();
			setCrmPanelMessage(result.message);
			return true;
		} catch (e: any) {
			setCrmPanelError(e?.message || "작업 중 오류가 발생했습니다.");
			return false;
		} finally {
			setCrmInactiveSubmitting(false);
		}
	}

	function resetCrmWorkspace() {
		setCrmFilters(createDefaultCrmFilters());
		setCrmTemplateFilters(createDefaultCrmTemplateFilters());
		setCrmSelectedTemplateId(null);
		setCrmTriggerDaysAhead("3");
		setCrmTriggerSubmitting(false);
		setCrmProcessSubmitting(false);
		setCrmInactiveDays("30");
		setCrmInactiveScheduledAt("");
		setCrmInactiveSubmitting(false);
		clearCrmFeedback();
	}

	return {
		crmFilters,
		setCrmFilters,
		crmTriggerDaysAhead,
		setCrmTriggerDaysAhead,
		crmTriggerScheduledAt,
		setCrmTriggerScheduledAt,
		crmTriggerSubmitting,
		crmInactiveSubmitting,
		crmProcessSubmitting,
		crmPanelMessage,
		crmPanelError,
		crmTemplateFilters,
		setCrmTemplateFilters,
		crmSelectedTemplateId,
		setCrmSelectedTemplateId,
		crmInactiveDays,
		setCrmInactiveDays,
		crmInactiveScheduledAt,
		setCrmInactiveScheduledAt,
		clearCrmFeedback,
		triggerCrmExpiryReminder,
		triggerCrmInactiveMemberCampaign,
		triggerCrmLongTermInactiveCampaign,
		processCrmQueue,
		resetCrmWorkspace,
	} as const;
}
