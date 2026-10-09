"use client";

import {
  ArmchairIcon,
  CheckIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  HandCoinsIcon,
  ListBulletsIcon,
  PencilSimpleIcon,
  ProhibitIcon,
  UsersIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useWaitText } from "@/components/orders/order-bits";
import { Button } from "@/components/ui/button";
import { availabilityQuery } from "@/lib/api/queries";
import type { ReservationOut, TableOut, UserRole } from "@/lib/api/schema";
import { canEditReservation, reservationMoves } from "@/lib/permissions";
import { isLate } from "@/lib/reservations";
import { useFormat } from "@/lib/use-format";
import { useReservationStatus } from "@/lib/use-reservation-actions";
import { cn } from "@/lib/utils";
import { BookingStatusPill, useWhen } from "./booking-bits";
import type { Decision } from "./booking-decision-dialog";

type BookingDetailsProps = {
  booking: ReservationOut;
  /** The booked table with its area and staff, when it's still in use. */
  table: TableOut | undefined;
  role: UserRole;
  today: string;
  now: number;
  /** Their table has paid and nothing is open: they've probably gone. */
  paid: boolean;
  onClose?: () => void;
  onDecide: (decision: Decision) => void;
  onEdit?: () => void;
};

/** Everything about one booking and the next thing to do with it. */
export function BookingDetails({
  booking,
  table,
  role,
  today,
  now,
  paid,
  onClose,
  onDecide,
  onEdit,
}: BookingDetailsProps) {
  const t = useTranslations("reservations.details");
  const format = useFormat();
  const when = useWhen();
  const wait = useWaitText();
  const move = useReservationStatus();
  const moves = reservationMoves(role, booking, now);
  const late = isLate(booking, now);
  const editable = onEdit && canEditReservation(role, booking);

  const free = useQuery(
    availabilityQuery(
      {
        startsAt: booking.startsAt,
        partySize: booking.partySize,
        minutes: booking.minutes,
        reservationId: booking.id,
      },
      booking.status === "requested" && !booking.table,
    ),
  ).data?.tables[0];

  const toStart = Math.round((Date.parse(booking.startsAt) - now) / 60_000);
  const timing =
    booking.status === "confirmed" && toStart > 0 && toStart <= 180
      ? t("arrivesIn", { time: wait(toStart) })
      : late
        ? t("lateBy", { time: wait(-toStart) })
        : null;
  const staff = table?.employees.map((person) => person.fullName.split(" ")[0]).join(", ");

  return (
    <section className="flex h-full flex-col">
      <header className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="truncate text-lg font-bold">{booking.customerName}</h2>
          <BookingStatusPill status={booking.status} late={late} />
        </div>
        {onClose && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("close")}>
            <XIcon />
          </Button>
        )}
      </header>

      <dl className="mt-5 grid gap-4 text-sm">
        <Fact icon={ClockIcon}>
          <dt className="sr-only">{t("when")}</dt>
          <dd className="font-bold tabular-nums">
            {when(booking.startsAt, today, format.timeRange(booking.startsAt, booking.endsAt))}
          </dd>
          <dd className="text-xs text-muted-foreground tabular-nums">
            {[t("minutes", { n: booking.minutes }), timing].filter(Boolean).join(" · ")}
          </dd>
        </Fact>
        <Fact icon={UsersIcon}>
          <dt className="sr-only">{t("guestsLabel")}</dt>
          <dd className="font-bold">{t("guests", { n: booking.partySize })}</dd>
          <dd>
            <a
              href={`tel:${booking.customerPhone}`}
              className="text-xs text-muted-foreground tabular-nums underline-offset-2 hover:text-foreground hover:underline"
            >
              {booking.customerPhone}
            </a>
          </dd>
        </Fact>
        {booking.customerEmail && (
          <Fact icon={EnvelopeSimpleIcon}>
            <dt className="sr-only">{t("email")}</dt>
            <dd className="truncate text-sm">{booking.customerEmail}</dd>
          </Fact>
        )}
        <Fact icon={ArmchairIcon}>
          <dt className="sr-only">{t("table")}</dt>
          {booking.table ? (
            <>
              <dd className="font-bold">
                {[booking.table.number, table?.location].filter(Boolean).join(" · ")}
              </dd>
              {table && (
                <dd className="text-xs text-muted-foreground">
                  {[t("seats", { n: table.seats }), staff && t("staff", { names: staff })]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              )}
            </>
          ) : (
            <>
              <dd className="font-bold">{t("noTable")}</dd>
              <dd className="text-xs text-muted-foreground">
                {free ? t("wouldGet", { table: free.number }) : t("noneFree")}
              </dd>
            </>
          )}
        </Fact>
        {booking.notes && (
          <Fact icon={ListBulletsIcon}>
            <dt className="sr-only">{t("notes")}</dt>
            <dd className="text-sm whitespace-pre-line">{booking.notes}</dd>
          </Fact>
        )}
        {booking.cancelReason && (
          <Fact icon={ProhibitIcon}>
            <dt className="sr-only">{t("reason")}</dt>
            <dd className="text-sm">{booking.cancelReason}</dd>
          </Fact>
        )}
      </dl>

      {late && moves.includes("no_show") && (
        <Notice icon={WarningCircleIcon} tone="amber">
          {t("lateHint", { time: wait(-toStart) })}
        </Notice>
      )}
      {paid && booking.status === "seated" && (
        <Notice icon={HandCoinsIcon} tone="green">
          {t("paidHint", { table: booking.table?.number ?? "" })}
        </Notice>
      )}

      <div className="mt-auto grid gap-2 pt-6">
        {moves.includes("confirmed") && (
          <Button
            size="lg"
            disabled={move.isPending}
            onClick={() => move.mutate({ booking, status: "confirmed" })}
          >
            <CheckIcon weight="bold" />
            {booking.table || free
              ? t("confirmAt", { table: booking.table?.number ?? free!.number })
              : t("confirm")}
          </Button>
        )}
        {moves.includes("seated") && (
          <Button
            size="lg"
            disabled={move.isPending}
            onClick={() => move.mutate({ booking, status: "seated" })}
          >
            <ArmchairIcon />
            {t("seat")}
          </Button>
        )}
        {moves.includes("completed") && (
          <Button
            size="lg"
            variant={paid ? "default" : "outline"}
            disabled={move.isPending}
            onClick={() => move.mutate({ booking, status: "completed" })}
          >
            <CheckIcon weight="bold" />
            {t("left")}
          </Button>
        )}
        <div className="flex flex-wrap gap-2 *:flex-1 empty:hidden">
          {editable && (
            <Button variant="outline" onClick={onEdit}>
              <PencilSimpleIcon />
              {t("edit")}
            </Button>
          )}
          {moves.includes("declined") && (
            <Button variant="outline" onClick={() => onDecide("declined")}>
              <XIcon />
              {t("decline")}
            </Button>
          )}
          {moves.includes("no_show") && (
            <Button variant="outline" onClick={() => onDecide("no_show")}>
              <ProhibitIcon />
              {t("noShow")}
            </Button>
          )}
          {moves.includes("cancelled") && booking.status !== "requested" && (
            <Button variant="outline" onClick={() => onDecide("cancelled")}>
              <XIcon />
              {t("cancel")}
            </Button>
          )}
        </div>
        <p className="pt-1 text-xs text-muted-foreground">
          {booking.source === "online"
            ? t("fromWebsite", { date: format.shortDate(booking.createdAt) })
            : t("bookedBy", {
                name: booking.createdBy?.fullName.split(" ")[0] ?? "—",
                date: format.shortDate(booking.createdAt),
              })}
          <span className="block truncate font-mono select-all">
            {t("code", { code: booking.trackingCode })}
          </span>
        </p>
      </div>
    </section>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof ClockIcon; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <Icon weight="duotone" className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Notice({
  icon: Icon,
  tone,
  children,
}: {
  icon: typeof ClockIcon;
  tone: "amber" | "green";
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "mt-5 flex gap-2.5 rounded-lg px-3.5 py-3 text-sm",
        tone === "amber"
          ? "bg-tone-amber-subtle text-tone-amber-text"
          : "bg-tone-green-subtle text-tone-green-text",
      )}
    >
      <Icon weight="duotone" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
