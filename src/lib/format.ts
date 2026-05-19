const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function formatYen(n: number | null | undefined) {
  return yen.format(n ?? 0);
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ja-JP", { timeStyle: "short" }).format(date);
}

export function formatMonth(month: string | Date) {
  const date = typeof month === "string" ? new Date(month) : month;
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}
