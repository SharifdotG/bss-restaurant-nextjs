import type { FoodOut, GroupBy, SalesRow, SalesSummary, TopFood } from "@/lib/api/schema";
import { shiftDay } from "@/lib/format";
import { toPaisa, toTaka } from "@/lib/money";

/** Both days included, as the API's dateFrom/dateTo. */
export type DayRange = { from: string; to: string };

export const PRESETS = ["today", "week", "month", "lastMonth", "year"] as const;
export type Preset = (typeof PRESETS)[number];

export const GROUPS = ["day", "week", "month", "year"] as const satisfies GroupBy[];

/** The API's top-foods report stops here, so a full list may be cut short. */
export const TOP_FOODS_LIMIT = 50;

const monthStart = (day: string) => `${day.slice(0, 8)}01`;
const yearStart = (day: string) => `${day.slice(0, 4)}-01-01`;

function monthEnd(day: string) {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/** The same day of the month some months away, clamped: 31 Mar a month back is 28 Feb. */
function sameDayIn(day: string, months: number) {
  const [year, month, date] = day.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 + months, 1)).toISOString().slice(0, 10);
  const last = Number(monthEnd(first).slice(8));
  return `${first.slice(0, 8)}${String(Math.min(date, last)).padStart(2, "0")}`;
}

export function presetRange(preset: Preset, today: string): DayRange {
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: shiftDay(today, -6), to: today };
    case "month":
      return { from: monthStart(today), to: today };
    case "lastMonth": {
      const end = shiftDay(monthStart(today), -1);
      return { from: monthStart(end), to: end };
    }
    case "year":
      return { from: yearStart(today), to: today };
  }
}

export const matchPreset = (range: DayRange, today: string) =>
  PRESETS.find((preset) => {
    const candidate = presetRange(preset, today);
    return candidate.from === range.from && candidate.to === range.to;
  }) ?? null;

export const rangeDays = ({ from, to }: DayRange) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;

/**
 * What a range is measured against. A month (or the start of one) goes against the same
 * days of the month before, the year so far against the same stretch last year, and
 * anything else against the same number of days just before it.
 */
export function compareRange(range: DayRange): DayRange {
  const { from, to } = range;
  if (from === monthStart(from) && to.slice(0, 7) === from.slice(0, 7)) {
    const previous = sameDayIn(from, -1);
    return { from: previous, to: to === monthEnd(to) ? monthEnd(previous) : sameDayIn(to, -1) };
  }
  if (from === yearStart(from) && to.slice(0, 4) === from.slice(0, 4)) {
    return { from: sameDayIn(from, -12), to: sameDayIn(to, -12) };
  }
  const days = rangeDays(range);
  return { from: shiftDay(from, -days), to: shiftDay(from, -1) };
}

/** Enough rows to read at a glance: a month by day, half a year by week, then by month. */
export function autoGroup(range: DayRange): GroupBy {
  const days = rangeDays(range);
  if (days <= 31) return "day";
  if (days <= 186) return "week";
  if (days <= 3 * 366) return "month";
  return "year";
}

/** Percent change, or null when the earlier figure is zero and a percentage means nothing. */
export function change(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** A round top for a chart axis and the step between its gridlines. */
export function niceScale(max: number, intervals = 4) {
  if (!(max > 0)) return { top: intervals * 1000, step: 1000 };
  const rough = max / intervals;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 1.5, 2, 2.5, 5, 10].map((factor) => factor * power).find((s) => s >= rough)!;
  return { top: step * intervals, step };
}

export const scaleTicks = ({ top, step }: { top: number; step: number }) =>
  Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);

export type SalesPoint = {
  start: string;
  end: string;
  sales: number;
  orders: number;
  /** The matching period from the comparison range, when there is one. */
  previous?: number;
  previousStart?: string;
  /** The period runs into today, so its number is still growing. */
  open: boolean;
};

/** Rows for the sales charts; the comparison is lined up period by period. */
export function salesPoints(rows: SalesRow[], today: string, previous?: SalesRow[]) {
  return rows.map((row, i): SalesPoint => ({
    start: row.periodStart,
    end: row.periodEnd,
    sales: row.sales,
    orders: row.orders,
    previous: previous?.[i]?.sales,
    previousStart: previous?.[i]?.periodStart,
    open: row.periodEnd >= today,
  }));
}

/** Of every ৳100 taken, how much went to VAT, refunds and expenses, and what was left. */
export function perHundred(totals: SalesSummary) {
  if (totals.sales <= 0) return null;
  const share = (part: number) => (part / totals.sales) * 100;
  return {
    vat: share(totals.vat),
    refunds: share(totals.refunds),
    expenses: share(totals.expenses),
    profit: share(totals.profit),
  };
}

const sumTaka = (values: number[]) => toTaka(values.reduce((sum, v) => sum + toPaisa(v), 0));

export type CategoryTotal = {
  category: string | null;
  revenue: number;
  plates: number;
  share: number;
};

/** Food revenue per category, worked out from the dishes in the report. */
export function categoryTotals(items: TopFood[]): CategoryTotal[] {
  const total = sumTaka(items.map((item) => item.revenue));
  const groups = new Map<string | null, TopFood[]>();
  for (const item of items) {
    const key = item.category ?? null;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups]
    .map(([category, foods]) => {
      const revenue = sumTaka(foods.map((food) => food.revenue));
      return {
        category,
        revenue,
        plates: foods.reduce((sum, food) => sum + food.quantity, 0),
        share: total > 0 ? (revenue / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export type SlowDish = {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  revenue: number;
  imageUrl?: string | null;
};

/**
 * The dishes selling least. Dishes on the menu that sold nothing count as zero, but only
 * when the report is complete; a cut-off list can't say the rest sold nothing.
 */
export function slowDishes(foods: FoodOut[], sold: TopFood[], count = 3): SlowDish[] {
  const complete = sold.length < TOP_FOODS_LIMIT;
  const byId = new Map(sold.map((food) => [food.id, food]));
  const unsold: SlowDish[] = complete
    ? foods
        .filter((food) => food.isAvailable && !byId.has(food.id))
        .map((food) => ({
          id: food.id,
          name: food.name,
          category: food.category?.name ?? null,
          quantity: 0,
          revenue: 0,
          imageUrl: food.imageUrl,
        }))
    : [];
  const selling = sold.map((food) => ({ ...food, category: food.category ?? null }));
  return [...unsold, ...selling]
    .sort(
      (a, b) => a.quantity - b.quantity || a.revenue - b.revenue || a.name.localeCompare(b.name),
    )
    .slice(0, count);
}

/** Overview chart spans: two weeks and the month by day, the year by month. */
export const OVERVIEW_SPANS = ["days14", "month", "year"] as const;
export type OverviewSpan = (typeof OVERVIEW_SPANS)[number];

export function spanRange(span: OverviewSpan, today: string): DayRange & { groupBy: GroupBy } {
  switch (span) {
    case "days14":
      return { from: shiftDay(today, -13), to: today, groupBy: "day" };
    case "month":
      return { from: monthStart(today), to: today, groupBy: "day" };
    case "year":
      return { from: yearStart(today), to: today, groupBy: "month" };
  }
}
