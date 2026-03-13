function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  return `${year}-${month}-${day}`;
}

export function todayLocalDate() {
  return formatLocalDate(new Date());
}

export function addDaysToLocalDate(dateText: string, days: number) {
  const [yearText, monthText, dayText] = dateText.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  return formatLocalDate(next);
}

export function addMonthsToLocalDate(dateText: string, months: number) {
  const [yearText, monthText, dayText] = dateText.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const next = new Date(year, month - 1, day);
  next.setMonth(next.getMonth() + months);
  return formatLocalDate(next);
}

export function startOfMonthLocalDate(dateText: string) {
  return `${dateText.slice(0, 8)}01`;
}
