import { useMemo, useCallback } from "react";
import { Calendar, dayjsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import dayjs from "dayjs";
import type { TrainerAvailabilitySnapshot } from "./modules/types";
import { transformEffectiveDaysToEvents, type CalendarEvent } from "./modules/calendarUtils";
import { CalendarEventCell } from "./modules/CalendarEventCell";

const localizer = dayjsLocalizer(dayjs);

type TrainerAvailabilityCalendarViewProps = {
  snapshot: TrainerAvailabilitySnapshot;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  interactive?: boolean;
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
    () => ({
      style: {
        backgroundColor: "transparent",
        border: "none",
      },
    }),
    []
  );

  return (
    <Calendar
      localizer={localizer}
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