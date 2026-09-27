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

/** ৳1,23,456.50 in English, ৳১,২৩,৪৫৬.৫০ in Bangla. The symbol always leads. */
export function formatMoney(taka: number, locale: Locale, symbol = "৳") {
  const paisa = toPaisa(taka);
  const amount = amountFormats[locale].format(Math.abs(paisa) / 100);
  return `${paisa < 0 ? "−" : ""}${symbol}${amount}`;
}
