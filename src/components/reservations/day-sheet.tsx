"use client";

import { useTranslations } from "next-intl";
import { PrintSheet } from "@/components/print-sheet";
import type { ReservationOut } from "@/lib/api/schema";
import { dayToDate } from "@/lib/format";
import { byStart } from "@/lib/reservations";
import { useFormat } from "@/lib/use-format";

type DaySheetProps = {
  restaurant: string;
  day: string;
  bookings: ReservationOut[];
  now: number;
};

/** The day's bookings on one sheet for the host stand, with a box to tick as guests arrive. */
export function DaySheet({ restaurant, day, bookings, now }: DaySheetProps) {
  const t = useTranslations("reservations.print");
  const status = useTranslations("status.reservation");
  const format = useFormat();
  const rows = bookings.toSorted(byStart);
  const guests = rows.reduce((sum, booking) => sum + booking.partySize, 0);

  return (
    <PrintSheet>
      <div className="px-1 text-sm text-foreground">
        <header className="flex items-end justify-between gap-6 border-b-2 border-foreground pb-3">
          <div>
            <p className="text-sm text-muted-foreground">{restaurant}</p>
            <h1 className="text-xl font-bold">
              {t("title", { day: format.weekday(dayToDate(day)) })}
            </h1>
          </div>
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {t("summary", { n: rows.length, guests })}
            <br />
            {t("printed", { at: format.dateTime(now) })}
          </p>
        </header>
        <table className="mt-3 w-full border-collapse tabular-nums">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              {(["time", "guest", "party", "table", "phone", "notes"] as const).map((key) => (
                <th key={key} className="py-2 pr-3 font-bold">
                  {t(key)}
                </th>
              ))}
              <th className="w-12 py-2 text-center font-bold">{t("here")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((booking) => (
              <tr key={booking.id} className="break-inside-avoid border-b border-border align-top">
                <td className="py-2 pr-3 font-bold whitespace-nowrap">
                  {format.time(booking.startsAt)}
                </td>
                <td className="py-2 pr-3">
                  <span className="font-bold">{booking.customerName}</span>
                  {booking.status !== "confirmed" && (
                    <span className="block text-xs text-muted-foreground">
                      {status(booking.status)}
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3">{format.number(booking.partySize)}</td>
                <td className="py-2 pr-3 font-bold">{booking.table?.number ?? "—"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{booking.customerPhone}</td>
                <td className="py-2 pr-3 text-xs">{booking.notes}</td>
                <td className="py-2 text-center">
                  <span className="inline-block size-4 rounded-xs border-2 border-foreground/60" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-muted-foreground">{t("none")}</p>}
      </div>
    </PrintSheet>
  );
}
