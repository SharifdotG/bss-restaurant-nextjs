import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { restaurantQuery } from "@/lib/api/queries";
import {
  formatClock,
  formatDate,
  formatDateTime,
  formatDay,
  formatDayRange,
  formatDayWithWeekday,
  formatHour,
  formatNumber,
  formatPeriod,
  formatPercent,
  formatRelative,
  formatShortDate,
  formatTime,
  formatTimeRange,
  formatWeekday,
  formatWeekdayName,
  formatWeekdayShort,
  shortOrderNumber,
} from "@/lib/format";
import { formatMoney, formatMoneyCompact, formatMoneyWhole } from "@/lib/money";
import { useSession } from "@/lib/session/client";

type DateInput = Date | string | number;

/** The formatters, bound to the current language and the restaurant's currency symbol. */
export function useFormat() {
  const locale = useLocale();
  const signedIn = useSession().status === "authenticated";
  const { data: symbol = "৳" } = useQuery({
    ...restaurantQuery,
    select: (restaurant) => restaurant.currencySymbol,
    enabled: signedIn,
  });

  return {
    locale,
    money: (taka: number) => formatMoney(taka, locale, symbol),
    moneyWhole: (taka: number) => formatMoneyWhole(taka, locale, symbol),
    moneyCompact: (taka: number) => formatMoneyCompact(taka, locale),
    time: (value: DateInput) => formatTime(value, locale),
    timeRange: (from: DateInput, to: DateInput) => formatTimeRange(from, to, locale),
    hour: (value: DateInput) => formatHour(value, locale),
    dayWithWeekday: (day: string) => formatDayWithWeekday(day, locale),
    clock: (time: string) => formatClock(time, locale),
    weekday: (value: DateInput) => formatWeekday(value, locale),
    weekdayName: (value: DateInput) => formatWeekdayName(value, locale),
    weekdayShort: (value: DateInput) => formatWeekdayShort(value, locale),
    date: (value: DateInput) => formatDate(value, locale),
    shortDate: (value: DateInput) => formatShortDate(value, locale),
    dateTime: (value: DateInput) => formatDateTime(value, locale),
    day: (value: string) => formatDay(value, locale),
    period: (
      start: string,
      end: string,
      groupBy: Parameters<typeof formatPeriod>[2],
      size: "tick" | "full" = "full",
    ) => formatPeriod(start, end, groupBy, locale, size),
    dayRange: (from: string, to: string, long?: boolean) => formatDayRange(from, to, locale, long),
    relative: (value: DateInput, now?: number) => formatRelative(value, locale, now),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    percent: (value: number) => formatPercent(value, locale),
    /** The number staff call out, "22", in the page's digits. */
    orderNo: (orderNumber: string) =>
      formatNumber(Number(shortOrderNumber(orderNumber)), locale, { useGrouping: false }),
  };
}
