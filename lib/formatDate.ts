/**
 * Human-Readable Date & Time Formatting Utilities
 * Dahotre Arts UI/UX Design System
 */

export function parseDateSafe(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  const str = String(dateInput).trim();
  if (!str) return null;

  // Append 'Z' to bare ISO strings (without offset) so JS parses them as UTC
  const normalized = str.includes('Z') || /[+-]\d{2}(:\d{2})?$/.test(str)
    ? str
    : (str.includes('T') ? `${str}Z` : `${str.replace(' ', 'T')}Z`);

  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date(str) : d;
}

/**
 * Formats a date into a human-friendly readable string:
 * E.g. "Today", "Yesterday", "31 Aug 2026"
 */
export function formatHumanDate(dateInput?: string | Date | null, options?: { showYearAlways?: boolean }): string {
  const d = parseDateSafe(dateInput);
  if (!d) return "—";

  const now = new Date();
  const isToday = d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate().toString().padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  if (!options?.showYearAlways && year === now.getFullYear()) {
    return `${day} ${month}`;
  }

  return `${day} ${month} ${year}`;
}

/**
 * Formats a date & time into a human-friendly readable string:
 * E.g. "Today at 3:36 PM", "Yesterday at 11:15 AM", "31 Aug 2026, 9:06 PM"
 */
export function formatHumanDateTime(dateInput?: string | Date | null): string {
  const d = parseDateSafe(dateInput);
  if (!d) return "—";

  const humanDate = formatHumanDate(d, { showYearAlways: true });
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });

  if (humanDate === "Today" || humanDate === "Yesterday") {
    return `${humanDate} at ${timeStr}`;
  }

  return `${humanDate}, ${timeStr}`;
}

/**
 * Formats time only (e.g. "3:36 PM")
 */
export function formatTimeOnly(dateInput?: string | Date | null): string {
  const d = parseDateSafe(dateInput);
  if (!d) return "—";

  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}

/**
 * Formats a date range into a concise human-readable summary
 * E.g. "31 Aug – 01 Sep 2026", "Today (01 Sep)", "All Time"
 */
export function formatHumanDateRange(from?: string | null, to?: string | null): string {
  if (!from && !to) return "All Time";
  if (from && !to) return `From ${formatHumanDate(from, { showYearAlways: true })}`;
  if (!from && to) return `Until ${formatHumanDate(to, { showYearAlways: true })}`;

  if (from === to) {
    return formatHumanDate(from, { showYearAlways: true });
  }

  const fromDate = parseDateSafe(from);
  const toDate = parseDateSafe(to);
  if (!fromDate || !toDate) return `${from} – ${to}`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fromDay = fromDate.getDate().toString().padStart(2, '0');
  const fromMonth = months[fromDate.getMonth()];
  const fromYear = fromDate.getFullYear();

  const toDay = toDate.getDate().toString().padStart(2, '0');
  const toMonth = months[toDate.getMonth()];
  const toYear = toDate.getFullYear();

  if (fromYear === toYear) {
    if (fromMonth === toMonth) {
      return `${fromDay} – ${toDay} ${toMonth} ${toYear}`;
    }
    return `${fromDay} ${fromMonth} – ${toDay} ${toMonth} ${toYear}`;
  }

  return `${fromDay} ${fromMonth} ${fromYear} – ${toDay} ${toMonth} ${toYear}`;
}
