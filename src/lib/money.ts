import type { Locale } from "@/i18n/routing";
import { toLatinDigits } from "@/lib/format";

// The API sends taka as JSON numbers (12.5 means ৳12.50). Anything we add, subtract or
// split happens in whole paisa so the till never shows ৳0.30000000000000004.

export const toPaisa = (taka: number) => Math.round(taka * 100);
export const toTaka = (paisa: number) => paisa / 100;

/** Change to hand back; never negative. */
export const changeDue = (tenderedPaisa: number, duePaisa: number) =>
  Math.max(0, tenderedPaisa - duePaisa);

/** Splits a bill into equal parts; the leftover paisa go to the first payers. */
export function splitEvenly(totalPaisa: number, parts: number): number[] {
  if (!Number.isInteger(parts) || parts < 1) return [totalPaisa];
  const base = Math.floor(totalPaisa / parts);
  const leftover = totalPaisa - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < leftover ? 1 : 0));
}

/**
 * Reads what someone typed into a money field: "1,250.5", "৳ ১২৫০", "1250." all work.
 * Returns paisa, or null when it isn't a non-negative amount with at most two decimals.
 */
export function parseMoney(input: string): number | null {
  const cleaned = toLatinDigits(input).replace(/[৳,\s]/g, "");
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(cleaned);
  if (!match || !/\d/.test(cleaned)) return null;
  const [, whole, fraction = ""] = match;
  return Number(whole || 0) * 100 + Number(fraction.padEnd(2, "0"));
}

// Lakh grouping in both languages; Bangla also gets Bangla digits.
const amountFormats: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  bn: new Intl.NumberFormat("bn-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

const wholeFormats: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }),
  bn: new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 0 }),
};

// Lakh and crore in compact form too: 80K, 1.5L.
const compactFormats: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }),
  bn: new Intl.NumberFormat("bn-BD", { notation: "compact", maximumFractionDigits: 1 }),
};

/** ৳1,23,456.50 in English, ৳১,২৩,৪৫৬.৫০ in Bangla. The symbol always leads. */
export function formatMoney(taka: number, locale: Locale, symbol = "৳") {
  const paisa = toPaisa(taka);
  const amount = amountFormats[locale].format(Math.abs(paisa) / 100);
  return `${paisa < 0 ? "−" : ""}${symbol}${amount}`;
}

/** Rounded to the taka for headline figures: ৳21,380. */
export function formatMoneyWhole(taka: number, locale: Locale, symbol = "৳") {
  const amount = wholeFormats[locale].format(Math.abs(Math.round(taka)));
  return `${taka <= -0.5 ? "−" : ""}${symbol}${amount}`;
}

/** Chart axes: 80K, 1.5L; no symbol, the chart title already says it's money. */
export const formatMoneyCompact = (taka: number, locale: Locale) =>
  compactFormats[locale].format(taka);
