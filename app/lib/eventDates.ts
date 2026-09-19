export function parseEventDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(`${String(value).split("T")[0]}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function effectiveEventEnd(startDate?: string | null, endDate?: string | null) {
  return parseEventDate(endDate) || parseEventDate(startDate);
}

export function formatEventDateRange(startDate?: string | null, endDate?: string | null) {
  const start = parseEventDate(startDate);
  const end = effectiveEventEnd(startDate, endDate);
  if (!start) return startDate || "Date TBD";
  if (!end || start.getTime() === end.getTime()) return start.toLocaleDateString();

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.toLocaleDateString(undefined, { month: "long" })} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
}

export function eventOccursOn(startDate: string, endDate: string | null | undefined, day: Date) {
  const start = parseEventDate(startDate);
  const end = effectiveEventEnd(startDate, endDate);
  if (!start || !end) return false;
  const candidate = new Date(day);
  candidate.setHours(0, 0, 0, 0);
  return candidate >= start && candidate <= end;
}
