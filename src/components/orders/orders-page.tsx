"use client";

import { KanbanIcon, ListBulletsIcon, PlusIcon } from "@phosphor-icons/react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageFrame } from "@/components/shell/page-frame";
import { buttonVariants } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { activeOrdersQuery, ordersQuery } from "@/lib/api/queries";
import { countQuery, ORDER_TABS, type DateRange, type OrderFilters } from "@/lib/orders";
import { can, PAGE_PATHS } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { ExportOrders } from "./export-orders";
import { OrdersBoard } from "./orders-board";
import { OrdersList } from "./orders-list";
import { useOrderUrl } from "./use-order-filters";

const BASE: OrderFilters = {
  tab: "all",
  search: "",
  sources: [],
  tableId: null,
  range: "today",
  waiterId: null,
  sort: "-createdAt",
  page: 1,
  size: 1,
};

/** Tab counts follow the chosen dates; open orders and bills due are counted whatever the day. */
function useTabCounts(range: DateRange, now: number) {
  const active = useQuery(activeOrdersQuery).data;
  const [all, paid, cancelled] = useQueries({
    queries: (["all", "paid", "cancelled"] as const).map((tab) => ({
      ...ordersQuery(countQuery(tab, { ...BASE, range }, now)),
      select: (page: { total: number }) => page.total,
    })),
  }).map((query) => query.data);

  return {
    open: active?.total,
    billsDue: active?.items.filter((order) => order.status === "served").length,
    all,
    paid,
    cancelled,
  };
}

export function OrdersPage() {
  const t = useTranslations("orders");
  const format = useFormat();
  const session = useSession();
  const [url, setUrl] = useOrderUrl();
  // A minute's tick keeps "today" right past midnight without refetching every second.
  const now = useNow(60_000);
  const counts = useTabCounts(url.range, now);
  // Exports are a desk job; phones keep the header to the one action.
  const phone = useShellLayout() === "phone";
  if (session.status !== "authenticated") return null;
  const { role } = session.user;

  // Phones always get the list; the board needs the width.
  const view = phone ? "list" : url.view;
  const tab = view === "board" ? "open" : url.tab;
  const when = url.range === "today" ? format.weekday(now) : t(`ranges.${url.range}`);
  const meta =
    counts.all === undefined || counts.open === undefined
      ? when
      : t("meta", { when, placed: counts.all, open: counts.open });

  return (
    <PageFrame
      page="orders"
      meta={meta}
      actions={
        <>
          {can(role, "reports.view") && !phone && <ExportOrders range={url.range} />}
          {can(role, "order.create") && (
            <Link href={PAGE_PATHS.newOrder} className={buttonVariants()}>
              <PlusIcon weight="bold" />
              {t("newOrder")}
            </Link>
          )}
        </>
      }
    >
      <Tabs
        value={tab}
        onValueChange={(next) =>
          // The board only holds open orders, so any other tab goes back to the list.
          void setUrl({ tab: next, page: null, view: next === "open" ? url.view : null })
        }
      >
        <div className="mb-5 flex items-end gap-4">
          <TabsList className="-mx-4 min-w-0 flex-1 px-4 md:mx-0 md:px-0">
            {ORDER_TABS.map((key) => (
              <TabsTab key={key} value={key} count={counts[key]}>
                {t(`tabs.${key}`)}
              </TabsTab>
            ))}
          </TabsList>
          {!phone && (
            <Segmented
              aria-label={t("views.label")}
              value={view}
              onValueChange={(next) =>
                void setUrl({ view: next, tab: next === "board" ? "open" : url.tab, page: null })
              }
              options={[
                {
                  value: "list",
                  label: (
                    <>
                      <ListBulletsIcon />
                      {t("views.list")}
                    </>
                  ),
                },
                {
                  value: "board",
                  label: (
                    <>
                      <KanbanIcon />
                      {t("views.board")}
                    </>
                  ),
                },
              ]}
              className="mb-1.5 shrink-0"
            />
          )}
        </div>
        <TabsPanel value={tab}>
          {view === "board" ? <OrdersBoard /> : <OrdersList role={role} />}
        </TabsPanel>
      </Tabs>
    </PageFrame>
  );
}
