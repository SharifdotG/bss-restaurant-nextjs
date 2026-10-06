import type { Locale } from "@/i18n/routing";

// The restaurant runs on Dhaka time (UTC+6, no daylight saving) whatever the device says.
export const TIME_ZONE = "Asia/Dhaka";
const DHAKA_OFFSET = "+06:00";

const intlLocale: Record<Locale, string> = { en: "en-BD", bn: "bn-BD" };

const BANGLA_ZERO = "০".charCodeAt(0);

/** ০-৯ to 0-9, so number fields accept either keyboard. */
export const toLatinDigits = (value: string) =>
  value.replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - BANGLA_ZERO));

type DateInput = Date | string | number;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

// Intl formatters are slow to build, so each locale/options pair is made once.
const cache = new Map<string, Intl.DateTimeFormat>();
function dateFormat(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(options);
  let format = cache.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale[locale], { timeZone: TIME_ZONE, ...options });
    cache.set(key, format);
  }
  return format;
}

const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
const DAY: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };

/** 7:45 PM */
export const formatTime = (value: DateInput, locale: Locale) =>
  dateFormat(locale, TIME).format(toDate(value));

/** Oct 11, 2026 */
export const formatDate = (value: DateInput, locale: Locale) =>
  dateFormat(locale, { ...DAY, year: "numeric" }).format(toDate(value));

/** Oct 11 */
export const formatShortDate = (value: DateInput, locale: Locale) =>
  dateFormat(locale, DAY).format(toDate(value));

/** Oct 11, 7:45 PM */
export const formatDateTime = (value: DateInput, locale: Locale) =>
  dateFormat(locale, { ...DAY, ...TIME }).format(toDate(value));

/** Sunday, 11 October */
export const formatWeekday = (value: DateInput, locale: Locale) =>
  dateFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(toDate(value));

/** A wall-clock time from the API ("23:00:00") as 11:00 PM. */
export const formatClock = (time: string, locale: Locale) =>
  formatTime(dhakaDateTime(businessDate(), time), locale);

/** "1–11 Oct 2026", or "1–11 October 2026" when there's room. Days are API dates. */
export function formatDayRange(from: string, to: string, locale: Locale, long = false) {
  const format = dateFormat(locale, {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
  });
  const noon = (day: string) => new Date(`${day}T12:00:00${DHAKA_OFFSET}`);
  return from === to ? format.format(noon(from)) : format.formatRange(noon(from), noon(to));
}

type Period = "day" | "week" | "month" | "year";

const PERIOD_TICK: Record<Period, Intl.DateTimeFormatOptions> = {
  day: { day: "numeric" },
  week: DAY,
  month: { month: "short" },
  year: { year: "numeric" },
};

const PERIOD_FULL: Record<Period, Intl.DateTimeFormatOptions> = {
  day: { weekday: "short", day: "numeric", month: "short" },
  week: DAY,
  month: { month: "long", year: "numeric" },
  year: { year: "numeric" },
};

/**
 * A report period for a chart: "28" or "Oct" on the axis, "Fri, Oct 9" or "Sep 28 – Oct 4"
 * in the tooltip. Days are API dates.
 */
export function formatPeriod(
  start: string,
  end: string,
  groupBy: Period,
  locale: Locale,
  size: "tick" | "full",
) {
  const noon = (day: string) => new Date(`${day}T12:00:00${DHAKA_OFFSET}`);
  const format = dateFormat(locale, (size === "tick" ? PERIOD_TICK : PERIOD_FULL)[groupBy]);
  return groupBy === "week" && size === "full" && start !== end
    ? format.formatRange(noon(start), noon(end))
    : format.format(noon(start));
}

/** An API date as a Date at noon in Dhaka, safe to hand to a calendar. */
export const dayToDate = (day: string) => new Date(`${day}T12:00:00${DHAKA_OFFSET}`);

/** A date-only value from the API ("2026-10-11"), shown without slipping a day. */
export const formatDay = (day: string, locale: Locale) =>
  formatDate(`${day}T12:00:00${DHAKA_OFFSET}`, locale);

const relativeFormats: Partial<Record<Locale, Intl.RelativeTimeFormat>> = {};

/** "just now", "5 minutes ago", "3 hours ago"; older than a day falls back to the date. */
export function formatRelative(value: DateInput, locale: Locale, now = Date.now()) {
  const format = (relativeFormats[locale] ??= new Intl.RelativeTimeFormat(intlLocale[locale], {
    numeric: "auto",
  }));
  const seconds = Math.round((toDate(value).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 45) return format.format(0, "second");
  if (abs < 3600) return format.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return format.format(Math.round(seconds / 3600), "hour");
  return formatDateTime(value, locale);
}

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** Today's date in Dhaka as the API writes it: "2026-10-11". */
export const businessDate = (now: DateInput = new Date()) => dayKey.format(toDate(now));

/** A business day moved by whole days: shiftDay("2026-10-01", -1) is "2026-09-30". */
export function shiftDay(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** A Dhaka wall-clock time for the API, which wants an explicit offset. */
export const dhakaDateTime = (day: string, time: string) =>
  `${day}T${time.length === 5 ? `${time}:00` : time}${DHAKA_OFFSET}`;

const numberFormats: Partial<Record<string, Intl.NumberFormat>> = {};

export function formatNumber(value: number, locale: Locale, options?: Intl.NumberFormatOptions) {
  const key = locale + JSON.stringify(options ?? {});
  const format = (numberFormats[key] ??= new Intl.NumberFormat(intlLocale[locale], options));
  return format.format(value);
}

/** The API's percentages are 0-100. */
export const formatPercent = (value: number, locale: Locale) =>
  formatNumber(value / 100, locale, { style: "percent", maximumFractionDigits: 1 });

/**
 * Order numbers are "YYMMDD-NNNN", counted per business day. Staff call out the
 * short form ("22"); the full one is for receipts and search.
 */
export function shortOrderNumber(orderNumber: string) {
  const counter = orderNumber.split("-").at(-1) ?? orderNumber;
  return String(Number(counter) || counter);
}
