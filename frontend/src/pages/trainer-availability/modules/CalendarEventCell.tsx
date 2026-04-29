import { memo } from "react";
import type { TrainerAvailabilityEffectiveDay, TrainerAvailabilityStatus } from "./types";
import { getAvailabilityStatusLabel, formatAvailabilityTimeRange } from "./types";

interface CalendarEventCellProps {
  event: {
    resource: TrainerAvailabilityEffectiveDay;
  };
}

const getStatusColor = (status: TrainerAvailabilityStatus): string => {
  switch (status) {
    case "AVAILABLE":
      return "#52c41a";
    case "OFF":
      return "#ff4d4f";
    default:
      return "#8c8c8c";
  }
};

const getBackgroundColor = (status: TrainerAvailabilityStatus): string => {
  switch (status) {
    case "AVAILABLE":
      return "#f6ffed";
    case "OFF":
      return "#fff2f0";
    default:
      return "#fafafa";
  }
};

export const CalendarEventCell = memo(function CalendarEventCell({
  event,
}: CalendarEventCellProps) {
  const resource = event.resource;
  const statusColor = getStatusColor(resource.availabilityStatus);
  const bgColor = getBackgroundColor(resource.availabilityStatus);
  const statusLabel = getAvailabilityStatusLabel(resource.availabilityStatus);
  const timeRange = formatAvailabilityTimeRange(resource.startTime, resource.endTime);

  return (
    <div
      style={{
        backgroundColor: bgColor,
        borderLeft: `3px solid ${statusColor}`,
        padding: "4px 6px",
        borderRadius: "4px",
        fontSize: "12px",
        lineHeight: 1.3,
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          color: statusColor,
          fontWeight: 600,
          fontSize: "11px",
          marginBottom: "2px",
        }}
      >
        {statusLabel}
      </div>
      {resource.availabilityStatus !== "UNSET" && (
        <div style={{ color: "#595959", fontSize: "11px" }}>{timeRange}</div>
      )}
    </div>
  );
});