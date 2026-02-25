export function formatDate(dateText: string | null): string {
  if (!dateText) {
    return "-";
  }
  return dateText;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDateTime(dateTimeText: string | null): string {
  if (!dateTimeText) {
    return "-";
  }
  return dateTimeText.replace("T", " ").replace("Z", " UTC");
}
