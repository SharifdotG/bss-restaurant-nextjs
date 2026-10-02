import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { restaurantQuery } from "@/lib/api/queries";
import {
  formatClock,
  formatDate,
  formatDateTime,
  formatDay,
  formatNumber,
  formatPercent,
  formatRelative,
  formatShortDate,
  formatTime,
  formatWeekday,
  shortOrderNumber,
} from "@/lib/format";
import { formatMoney } from "@/lib/money";
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
    time: (value: DateInput) => formatTime(value, locale),
    clock: (time: string) => formatClock(time, locale),
    weekday: (value: DateInput) => formatWeekday(value, locale),
    date: (value: DateInput) => formatDate(value, locale),
    shortDate: (value: DateInput) => formatShortDate(value, locale),
    dateTime: (value: DateInput) => formatDateTime(value, locale),
    day: (value: string) => formatDay(value, locale),
    relative: (value: DateInput, now?: number) => formatRelative(value, locale, now),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(value, locale, options),
    percent: (value: number) => formatPercent(value, locale),
    /** The number staff call out, "22", in the page's digits. */
    orderNo: (orderNumber: string) =>
      formatNumber(Number(shortOrderNumber(orderNumber)), locale, { useGrouping: false }),
  };
}
