import type { PrototypeAuthUser } from "../../../app/auth";
import AccessSummaryWidget from "./AccessSummaryWidget";
import CrmActionWidget from "./CrmActionWidget";
import MetricsSummaryWidget from "./MetricsSummaryWidget";
import ScheduleOverviewWidget from "./ScheduleOverviewWidget";
import TrainerScheduleWidget from "./TrainerScheduleWidget";
import type { DashboardWidgetConfig, WidgetBaseProps, WidgetId } from "./types";

const WIDGET_COMPONENTS: Record<
	WidgetId,
	React.ComponentType<WidgetBaseProps>
> = {
	accessSummary: AccessSummaryWidget,
	metricsSummary: MetricsSummaryWidget,
	scheduleOverview: ScheduleOverviewWidget,
	trainerSchedule: TrainerScheduleWidget,
	crmAction: CrmActionWidget,
};

/**
 * Returns the list of widgets to display based on the user roles.
 *
 * Role Templates:
 * - Admin/Manager: [AccessSummary, MetricsSummary, ScheduleOverview]
 * - Desk: [AccessSummary, ScheduleOverview, CrmAction]
 * - Trainer: [TrainerSchedule, CrmAction]
 */
export function getDashboardWidgetConfig(
	authUser: PrototypeAuthUser | null | undefined,
): DashboardWidgetConfig[] {
	if (!authUser) {
		return [];
	}

	const primaryRole = authUser.primaryRole;

	let widgetIds: WidgetId[] = [];

	switch (primaryRole) {
		case "ROLE_SUPER_ADMIN":
		case "ROLE_MANAGER":
			widgetIds = ["accessSummary", "metricsSummary", "scheduleOverview"];
			break;

		case "ROLE_DESK":
			widgetIds = ["accessSummary", "scheduleOverview", "crmAction"];
			break;

		case "ROLE_TRAINER":
			widgetIds = ["trainerSchedule", "crmAction"];
			break;

		default:
			// Fallback for unknown roles - maybe show a basic set or empty
			widgetIds = [];
			break;
	}

	return widgetIds.map((id) => ({
		id,
		component: WIDGET_COMPONENTS[id],
	}));
}
