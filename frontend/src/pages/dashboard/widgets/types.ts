import type { ReactNode } from "react";

export type WidgetId =
  | "accessSummary"
  | "metricsSummary"
  | "scheduleOverview"
  | "trainerSchedule"
  | "crmAction";

export interface WidgetBaseProps {
  /**
   * Title of the widget card
   */
  title?: ReactNode;
}

export interface DashboardWidgetConfig {
  id: WidgetId;
  component: React.ComponentType<WidgetBaseProps>;
}
