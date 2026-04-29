import type { TrainerAvailabilityEffectiveDay } from "./types";
import { getAvailabilityStatusLabel, formatAvailabilityTimeRange } from "./types";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: TrainerAvailabilityEffectiveDay;
}

function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function transformEffectiveDaysToEvents(
  effectiveDays: TrainerAvailabilityEffectiveDay[]
): CalendarEvent[] {
  if (!effectiveDays || effectiveDays.length === 0) {
    return [];
  }

  return effectiveDays
    .filter((day) => day.availabilityStatus !== "UNSET")
    .map((day) => {
      const date = parseDateString(day.date);
      const startTime = day.startTime ? day.startTime.slice(0, 5) : "00:00";
      const endTime = day.endTime ? day.endTime.slice(0, 5) : "23:59";

      const startParts = startTime.split(":");
      const endParts = endTime.split(":");

      const start = new Date(date);
      start.setHours(Number(startParts[0]), Number(startParts[1]), 0, 0);

      const end = new Date(date);
      end.setHours(Number(endParts[0]), Number(endParts[1]), 0, 0);

      const statusLabel = getAvailabilityStatusLabel(day.availabilityStatus);
      const timeRange = formatAvailabilityTimeRange(day.startTime, day.endTime);

      return {
        id: day.date,
        title: `${statusLabel} ${timeRange}`,
        start,
        end,
        resource: day,
      };
    });
}