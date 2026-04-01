import type { PrototypeAuthUser } from "../../../app/auth";
import type { DashboardWidgetConfig, WidgetId } from "./types";

import AccessSummaryWidget from "./AccessSummaryWidget";
import MetricsSummaryWidget from "./MetricsSummaryWidget";
import ScheduleOverviewWidget from "./ScheduleOverviewWidget";
import TrainerScheduleWidget from "./TrainerScheduleWidget";
import CrmActionWidget from "./CrmActionWidget";

const WIDGET_COMPONENTS: Record<WidgetId, React.ComponentType<any>> = {
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
 * - Admin/CenterAdmin: [AccessSummary, MetricsSummary, ScheduleOverview]
 * - Manager/Desk: [AccessSummary, ScheduleOverview, CrmAction]
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
    case "ROLE_CENTER_ADMIN":
      widgetIds = ["accessSummary", "metricsSummary", "scheduleOverview"];
      break;

    case "ROLE_MANAGER":
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
