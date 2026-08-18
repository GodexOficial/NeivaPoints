/**
 * Format ISO date string into readable full date & time:
 * Example: "August 17, 2026 — 10:35 AM"
 */
export function formatDateTime(isoString: string, locale: string = "en-US"): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const datePart = new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);

    const timePart = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: locale.startsWith("en"),
    }).format(date);

    return `${datePart} — ${timePart}`;
  } catch {
    return isoString;
  }
}

/**
 * Format ISO date string into date only:
 * Example: "August 17, 2026"
 */
export function formatDateOnly(isoString: string, locale: string = "en-US"): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return new Intl.DateTimeFormat(locale, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format ISO date string into time only:
 * Example: "10:35 AM"
 */
export function formatTimeOnly(isoString: string, locale: string = "en-US"): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: locale.startsWith("en"),
    }).format(date);
  } catch {
    return isoString;
  }
}
