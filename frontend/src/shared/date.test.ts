import { describe, expect, it, vi } from "vitest";

import { addDaysToLocalDate, addMonthsToLocalDate, formatLocalDate, startOfMonthLocalDate, todayLocalDate } from "./date";

describe("date helpers", () => {
  it("formats local calendar dates without UTC rollover", () => {
    const date = new Date(2026, 2, 14, 0, 30, 0);
    expect(formatLocalDate(date)).toBe("2026-03-14");
  });

  it("adds days and months using local date text", () => {
    expect(addDaysToLocalDate("2026-03-14", 7)).toBe("2026-03-21");
    expect(addMonthsToLocalDate("2026-03-31", 1)).toBe("2026-05-01");
  });

  it("builds today and month-start strings from local time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 14, 0, 30, 0));

    expect(todayLocalDate()).toBe("2026-03-14");
    expect(startOfMonthLocalDate(todayLocalDate())).toBe("2026-03-01");

    vi.useRealTimers();
  });
});
