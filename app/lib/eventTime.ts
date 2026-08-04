export const DEFAULT_EVENT_TIMEZONE = "America/Los_Angeles";

export function timeInputValue(value?: string | null) {
  return value ? String(value).slice(0, 5) : "";
}

function displayTime(value?: string | null) {
  const input = timeInputValue(value);
  if (!/^\d{2}:\d{2}$/.test(input)) return "";
  const [hours, minutes] = input.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes));
}

export function formatEventTime(start?: string | null, end?: string | null, timezone?: string | null) {
  const startLabel = displayTime(start);
  if (!startLabel) return "Time TBD";
  const endLabel = displayTime(end);
  const timeLabel = endLabel ? `${startLabel}–${endLabel}` : startLabel;
  const zoneLabel = timezone === DEFAULT_EVENT_TIMEZONE ? "PT" : timezone || "";
  return zoneLabel ? `${timeLabel} ${zoneLabel}` : timeLabel;
}
