/*
 * Human-readable event start, e.g. "Sat 17 Oct, 18:00", in the event's own
 * timezone (so a Berlin event reads as Berlin time), else the device timezone.
 */
export function formatEventDate(startAt: string, timezone?: string): string {
  const date = new Date(startAt);
  if (Number.isNaN(date.getTime())) return "";
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  };
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", { ...options, timeZone: timezone || undefined }).formatToParts(date);
  } catch {
    // Unknown timezone name: fall back to the device timezone.
    parts = new Intl.DateTimeFormat("en-GB", options).formatToParts(date);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")}`;
}
