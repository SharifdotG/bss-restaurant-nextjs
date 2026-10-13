"use client";

import { ChartBarIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageFrame } from "@/components/shell/page-frame";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import {
  activeOrdersQuery,
  dashboardQuery,
  dayBookingsQuery,
  salesReportQuery,
} from "@/lib/api/queries";
import { businessDate, shiftDay } from "@/lib/format";
import { useFirstVisit } from "@/lib/motion";
import { can, PAGE_PATHS } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { AttentionPanel } from "./attention-panel";
import { BookingsPanel, upcomingBookings } from "./bookings-panel";
import { OpenOrdersPanel } from "./open-orders-panel";
import { OverviewKpis } from "./overview-kpis";
import { SalesPanel } from "./sales-panel";
import { SourcesPanel } from "./sources-panel";
import { TopDishesPanel } from "./top-dishes-panel";

const HOUR = 60 * 60_000;

/**
 * The manager's first screen: today's numbers, then what needs doing, then how the month is
 * going. Cashiers get the same page without the report-backed sales chart.
 */
export function OverviewPage() {
  const t = useTranslations("overview");
  const pages = useTranslations("pages");
  const session = useSession();
  const phone = useShellLayout() === "phone";
  // Ticks each half minute so waits and "next hour" stay right without a refetch.
  const now = useNow(30_000);
  const today = businessDate(now);
  const manager = session.status === "authenticated" && can(session.user.role, "reports.view");
  // The first look after signing in: cards rise in reading order, once per session.
  const intro = useFirstVisit("intro:overview");

  const dashboard = useQuery(dashboardQuery).data;
  const active = useQuery(activeOrdersQuery).data?.items;
  const bookings = useQuery(dayBookingsQuery(today)).data;
  const weekAgo = shiftDay(today, -7);
  const lastWeek = useQuery({
    ...salesReportQuery({ from: weekAgo, to: weekAgo, groupBy: "day" }),
    enabled: manager,
  }).data;

  if (session.status !== "authenticated") return null;
  const { role } = session.user;
  const soon = bookings
    ? upcomingBookings(bookings, now).filter(
        (booking) => booking.status === "confirmed" && Date.parse(booking.startsAt) - now <= HOUR,
      ).length
    : undefined;

  // Rows line up on wide screens: [chart | open], [attention | bookings], [dishes | sources].
  // Narrower, the small cards pair up and the wide ones take the full row. On a phone what
  // needs doing comes first and the month's picture goes to the end.
  const wide = "md:col-span-2 lg:col-span-6 xl:col-span-1 xl:col-start-1";
  const side = "lg:col-span-3 xl:col-span-1 xl:col-start-2";
  const later = "max-md:order-1";

  return (
    <PageFrame
      page="overview"
      meta={pages("overview")}
      actions={
        <>
          {manager && !phone && (
            <Link
              href={`${PAGE_PATHS.reports}?range=today`}
              className={buttonVariants({ variant: "outline" })}
            >
              <ChartBarIcon />
              {t("todayReport")}
            </Link>
          )}
          {can(role, "order.create") && (
            <Link href={PAGE_PATHS.newOrder} className={buttonVariants()}>
              <PlusIcon weight="bold" />
              {t("newOrder")}
            </Link>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <OverviewKpis
          className={cn(intro && "rise-children")}
          dashboard={dashboard}
          lastWeek={lastWeek && { sales: lastWeek.totals.sales, day: now }}
          bookingsSoon={soon}
        />
        <div
          className={cn(
            "grid grid-flow-dense grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]",
            intro && "rise-children [--rise-from:160ms]",
          )}
        >
          {manager && <SalesPanel today={today} className={cn(wide, later)} />}
          <OpenOrdersPanel orders={active} className={side} />
          <AttentionPanel orders={active} now={now} className={cn(wide, "max-md:-order-1")} />
          <BookingsPanel bookings={bookings} now={now} className={side} />
          <TopDishesPanel
            foods={dashboard?.topFoodsThisMonth}
            reports={manager}
            className={cn(wide, later)}
          />
          <SourcesPanel
            today={today}
            className={cn(
              "md:col-span-2 lg:col-span-6",
              later,
              manager ? "xl:col-span-1 xl:col-start-2" : "xl:col-span-2 xl:col-start-1",
            )}
          />
        </div>
      </div>
    </PageFrame>
  );
}
