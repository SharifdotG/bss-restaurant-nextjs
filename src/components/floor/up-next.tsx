"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useOrderWhere } from "@/components/orders/order-bits";
import { Link } from "@/i18n/navigation";
import type { OrderOut, ReservationOut } from "@/lib/api/schema";
import { PAGE_PATHS } from "@/lib/permissions";
import { TONES, type Tone } from "@/lib/tones";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type UpNextProps = {
  ready: OrderOut[];
  arriving: ReservationOut[];
  toPay: OrderOut[];
  canBill: boolean;
};

/** What the floor needs to do next: food to carry, guests to seat, bills to settle. */
export function UpNext({ ready, arriving, toPay, canBill }: UpNextProps) {
  const t = useTranslations("floor.upNext");
  const format = useFormat();
  const where = useOrderWhere();
  const empty = ready.length + arriving.length + toPay.length === 0;

  return (
    <section className="rounded-xl bg-card p-5 shadow-md">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      {empty && <p className="mt-2 text-sm text-muted-foreground">{t("empty")}</p>}

      {ready.length > 0 && (
        <Group title={t("ready")}>
          {ready.map((order) => {
            const place = where(order);
            return (
              <Row
                key={order.id}
                href={`${PAGE_PATHS.orders}/${order.id}`}
                tone="green"
                tile={format.orderNo(order.orderNumber)}
                title={[place.title, order.customerName].filter(Boolean).join(" · ")}
                detail={place.detail}
                amount={format.money(order.total)}
              />
            );
          })}
        </Group>
      )}

      {arriving.length > 0 && (
        <Group title={t("arriving")}>
          {arriving.map((booking) => (
            <Row
              key={booking.id}
              href={PAGE_PATHS.reservations}
              tone={booking.status === "requested" ? "amber" : "green"}
              tile={format.time(booking.startsAt)}
              smallTile
              title={t("party", { name: booking.customerName, n: booking.partySize })}
              detail={
                booking.table
                  ? booking.table.number
                  : booking.status === "requested"
                    ? t("request")
                    : t("noTable")
              }
            />
          ))}
        </Group>
      )}

      {toPay.length > 0 && (
        <Group title={t("toPay")}>
          {toPay.map((order) => (
            <Row
              key={order.id}
              href={
                canBill
                  ? `${PAGE_PATHS.billing}?order=${order.id}`
                  : `${PAGE_PATHS.orders}/${order.id}`
              }
              tone="slate"
              tile={order.table?.number ?? t("takeawayShort")}
              title={t("order", { n: format.orderNo(order.orderNumber) })}
              detail={
                order.amountPaid > 0
                  ? t("paidSoFar", { amount: format.money(order.amountPaid) })
                  : t("servedAt", { time: format.time(order.updatedAt) })
              }
              amount={format.money(order.balanceDue)}
            />
          ))}
        </Group>
      )}

      {canBill && toPay.length > 0 && (
        <Link
          href={PAGE_PATHS.billing}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
        >
          {t("openBilling")}
          <ArrowRightIcon weight="bold" className="size-4" />
        </Link>
      )}
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-4 first-of-type:border-0 first-of-type:pt-0">
      <h3 className="text-xs font-bold text-muted-foreground">{title}</h3>
      <ul className="mt-2 grid gap-1">{children}</ul>
    </div>
  );
}

type RowProps = {
  href: string;
  tone: Tone;
  tile: string;
  title: string;
  detail: string;
  amount?: string;
  /** Times need two short lines inside the tile. */
  smallTile?: boolean;
};

function Row({ href, tone, tile, title, detail, amount, smallTile }: RowProps) {
  return (
    <li>
      <Link
        href={href}
        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 outline-none hover:bg-foreground/[0.04] focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-lg text-center font-bold tabular-nums",
            smallTile ? "px-1 text-2xs leading-tight" : "text-sm",
            TONES[tone],
          )}
        >
          {tile}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{detail}</span>
        </span>
        {amount && <span className="text-sm font-bold tabular-nums">{amount}</span>}
      </Link>
    </li>
  );
}
