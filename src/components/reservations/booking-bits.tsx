"use client";

import { useTranslations } from "next-intl";
import { Pill } from "@/components/ui/pill";
import type { ReservationStatus } from "@/lib/api/schema";
import { businessDate, dhakaDateTime, shiftDay } from "@/lib/format";
import { BOOKING_LOOK } from "@/lib/reservations";
import { useFormat } from "@/lib/use-format";

export function BookingStatusPill({
  status,
  late,
  className,
}: {
  status: ReservationStatus;
  late?: boolean;
  className?: string;
}) {
  const t = useTranslations("status.reservation");
  const words = useTranslations("reservations");
  const { tone, icon } = BOOKING_LOOK[status];
  return (
    <Pill tone={late ? "amber" : tone} icon={icon} className={className}>
      {late ? words("late") : t(status)}
    </Pill>
  );
}

/**
 * "Tonight 9:30 PM", "Tomorrow 1:00 PM", "Mon 1:00 PM", then the date for later days. Pass
 * `time` to show something else after the day, like a time range.
 */
export function useWhen() {
  const t = useTranslations("reservations.when");
  const format = useFormat();
  return (startsAt: string, today: string, time = format.time(startsAt)) => {
    const day = businessDate(startsAt);
    if (day === today) {
      const evening = Date.parse(startsAt) >= Date.parse(dhakaDateTime(day, "17:00"));
      return t(evening ? "tonight" : "today", { time });
    }
    if (day === shiftDay(today, 1)) return t("tomorrow", { time });
    if (day > today && day <= shiftDay(today, 6)) {
      return t("weekday", { day: format.weekdayShort(startsAt), time });
    }
    return t("date", { date: format.shortDate(startsAt), time });
  };
}
