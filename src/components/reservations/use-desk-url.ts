"use client";

import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

export const SHOW = ["all", "coming", "seated", "finished"] as const;
export type Show = (typeof SHOW)[number];

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const params = {
  day: parseAsString,
  booking: parseAsInteger,
  q: parseAsString,
  area: parseAsString,
  show: parseAsStringLiteral(SHOW).withDefault("all"),
};

/** The desk's day, open booking, search and filters live in the address, so a link reopens them. */
export function useDeskUrl(today: string) {
  const [url, setUrl] = useQueryStates(params, { history: "replace" });
  const day = url.day && DAY.test(url.day) ? url.day : today;

  return {
    day,
    isToday: day === today,
    booking: url.booking,
    search: url.q ?? "",
    area: url.area,
    show: url.show,
    setDay: (next: string) => void setUrl({ day: next === today ? null : next, booking: null }),
    open: (booking: number | null, onDay?: string) =>
      void setUrl({
        booking,
        ...(onDay ? { day: onDay === today ? null : onDay, q: null } : {}),
      }),
    setSearch: (q: string) => void setUrl({ q: q || null }),
    setArea: (area: string | null) => void setUrl({ area }),
    setShow: (show: Show) => void setUrl({ show: show === "all" ? null : show }),
  };
}

export type DeskUrl = ReturnType<typeof useDeskUrl>;
