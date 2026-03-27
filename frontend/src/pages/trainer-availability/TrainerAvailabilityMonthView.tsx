import type { TrainerAvailabilitySnapshot } from "./modules/types";
import {
  formatAvailabilityTimeRange,
  getAvailabilityStatusLabel,
} from "./modules/types";

import styles from "./TrainerAvailabilityPage.module.css";

type TrainerAvailabilityMonthViewProps = {
  snapshot: TrainerAvailabilitySnapshot;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  interactive?: boolean;
};

function getDayNumber(date: string) {
  return Number(date.slice(-2));
}

export function TrainerAvailabilityMonthView({
  snapshot,
  selectedDate,
  onSelectDate,
  interactive = false,
}: TrainerAvailabilityMonthViewProps) {
  return (
    <div className={styles.calendarGrid}>
      {snapshot.effectiveDays.map((day) => {
        const statusClassName =
          day.availabilityStatus === "AVAILABLE"
            ? styles.dayAvailable
            : day.availabilityStatus === "OFF"
              ? styles.dayOff
              : styles.dayUnset;
        const isSelected = selectedDate === day.date;
        const buttonClassName = [
          styles.dayCard,
          statusClassName,
          isSelected ? styles.dayCardSelected : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={day.date}
            type="button"
            className={buttonClassName}
            onClick={() => onSelectDate?.(day.date)}
            disabled={!interactive}
          >
            <span className={styles.dayNumber}>{getDayNumber(day.date)}</span>
            <span className={styles.dayStatus}>
              {getAvailabilityStatusLabel(day.availabilityStatus)}
            </span>
            <span className={styles.dayTimeRange}>
              {formatAvailabilityTimeRange(day.startTime, day.endTime)}
            </span>
            {day.memo ? <span className={styles.dayMemo}>{day.memo}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
