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