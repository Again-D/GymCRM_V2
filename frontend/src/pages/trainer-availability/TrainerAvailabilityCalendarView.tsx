import { useMemo, useCallback } from "react";
import { Calendar } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { TrainerAvailabilitySnapshot } from "./modules/types";
import { transformEffectiveDaysToEvents, type CalendarEvent } from "./modules/calendarUtils";
import { CalendarEventCell } from "./modules/CalendarEventCell";

type TrainerAvailabilityCalendarViewProps = {
  snapshot: TrainerAvailabilitySnapshot;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  interactive?: boolean;
};

// @ts-ignore - localizer type mismatch with @types/react-big-calendar
const localizer = {
  format: (date: Date, formatStr: string) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dayOfWeek = date.getDay();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    if (formatStr === "headerFormat") {
      return weekdays[dayOfWeek];
    }
    if (formatStr === "dayFormat") {
      return day;
    }
    if (formatStr === "monthFormat") {
      return `${year}-${month}`;
    }
    if (formatStr === "weekdayFormat") {
      return weekdays[dayOfWeek];
    }
    return `${year}-${month}-${day}`;
  },
  parse: (value: string) => new Date(value),
  startOfWeek: () => 0,
  getFirstDayOfWeek: () => 0,
  eq: (date1: Date, date2: Date) => date1.getTime() === date2.getTime(),
  neq: (date1: Date, date2: Date) => date1.getTime() !== date2.getTime(),
  lt: (date1: Date, date2: Date) => date1.getTime() < date2.getTime(),
  lte: (date1: Date, date2: Date) => date1.getTime() <= date2.getTime(),
  gt: (date1: Date, date2: Date) => date1.getTime() > date2.getTime(),
  gte: (date1: Date, date2: Date) => date1.getTime() >= date2.getTime(),
  add: (date: Date, amount: number, unit: string) => {
    const result = new Date(date);
    if (unit === "day") result.setDate(result.getDate() + amount);
    if (unit === "month") result.setMonth(result.getMonth() + amount);
    if (unit === "hour") result.setHours(result.getHours() + amount);
    if (unit === "minute") result.setMinutes(result.getMinutes() + amount);
    return result;
  },
  subtract: (date: Date, amount: number, unit: string) => {
    const result = new Date(date);
    if (unit === "day") result.setDate(result.getDate() - amount);
    if (unit === "month") result.setMonth(result.getMonth() - amount);
    if (unit === "hour") result.setHours(result.getHours() - amount);
    if (unit === "minute") result.setMinutes(result.getMinutes() - amount);
    return result;
  },
  diff: (date1: Date, date2: Date, unit: string) => {
    const diffMs = date1.getTime() - date2.getTime();
    if (unit === "day") return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (unit === "hour") return Math.floor(diffMs / (1000 * 60 * 60));
    if (unit === "minute") return Math.floor(diffMs / (1000 * 60));
    return diffMs;
  },
  getNow: () => new Date(),
  getTotalDuration: (start: Date, end: Date) => {
    const diffMs = end.getTime() - start.getTime();
    return { milliseconds: diffMs, seconds: diffMs / 1000, minutes: diffMs / (1000 * 60), hours: diffMs / (1000 * 60 * 60), days: diffMs / (1000 * 60 * 60 * 24) };
  },
};

export function TrainerAvailabilityCalendarView({
  snapshot,
  selectedDate,
  onSelectDate,
  interactive = false,
}: TrainerAvailabilityCalendarViewProps) {
  const events = useMemo(
    () => transformEffectiveDaysToEvents(snapshot.effectiveDays),
    [snapshot.effectiveDays]
  );

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (interactive && onSelectDate) {
        onSelectDate(event.resource.date);
      }
    },
    [interactive, onSelectDate]
  );

  const selectedMonth = snapshot.month;
  const [year, month] = selectedMonth.split("-").map(Number);
  const defaultDate = new Date(year, month - 1, 1);

  const eventPropGetter = useCallback(
    (_event: CalendarEvent) => {
      return {
        style: {
          backgroundColor: "transparent",
          border: "none",
        },
      };
    },
    []
  );

  return (
    <Calendar
      localizer={localizer as unknown as React.ComponentProps<typeof Calendar>["localizer"]}
      events={events}
      startAccessor="start"
      endAccessor="end"
      defaultDate={defaultDate}
      defaultView="month"
      views={["month"]}
      components={{
        event: CalendarEventCell,
      }}
      eventPropGetter={eventPropGetter}
      onSelectEvent={handleSelectEvent}
      selectable={interactive}
      style={{ height: 600 }}
      messages={{
        today: "오늘",
        previous: "이전",
        next: "다음",
        month: "월",
        week: "주",
        day: "일",
        agenda: "일정",
        noEventsInRange: "표시할 일정이 없습니다",
      }}
    />
  );
}