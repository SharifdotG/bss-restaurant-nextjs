"use client";

import { BowlFoodIcon, CrownSimpleIcon, ForkKnifeIcon, MoneyIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { FoodThumb } from "@/components/food-thumb";
import { Panel } from "@/components/panel";
import { Delta } from "@/components/stats/delta";
import { KpiCard } from "@/components/stats/kpi-card";
import { ShareBar } from "@/components/stats/share-bar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { foodsQuery, topFoodsQuery } from "@/lib/api/queries";
import type { TopFood } from "@/lib/api/schema";
import { toPaisa, toTaka } from "@/lib/money";
import { categoryTotals, change, slowDishes, TOP_FOODS_LIMIT } from "@/lib/reports";
import { useFormat } from "@/lib/use-format";
import { ReportCsv } from "./report-csv";
import type { ReportUrl } from "./use-report-url";

const SHOWN = 10;

const totalsOf = (items: TopFood[]) => ({
  plates: items.reduce((sum, item) => sum + item.quantity, 0),
  revenue: toTaka(items.reduce((sum, item) => sum + toPaisa(item.revenue), 0)),
});

/** What sold: the best dishes, food revenue by category, and what's barely moving. */
export function DishesTab({ url }: { url: ReportUrl }) {
  const t = useTranslations("reports.dishes");
  const format = useFormat();
  const { range, compare } = url;
  // The API's full limit, so categories and totals are worked out from every dish it has.
  const items = useQuery(topFoodsQuery({ ...range, limit: TOP_FOODS_LIMIT })).data?.items;
  const before = useQuery(topFoodsQuery({ ...compare, limit: TOP_FOODS_LIMIT })).data?.items;
  const menu = useQuery(foodsQuery).data;

  const now = items && totalsOf(items);
  const then = before && totalsOf(before);
  const best = items?.[0];
  const bestBefore = best && before?.find((item) => item.id === best.id);
  const empty = items?.length === 0;
  const compareLabel = format.dayRange(compare.from, compare.to);
  const rangeLabel = format.dayRange(range.from, range.to);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
        <KpiCard
          id={`reports.plates.${range.from}.${range.to}`}
          label={t("kpis.plates")}
          icon={ForkKnifeIcon}
          value={now?.plates}
          format={(n) => format.number(Math.round(n))}
          badge={now && then && !empty && <Delta value={change(now.plates, then.plates)} />}
          note={
            empty
              ? t("nothing")
              : then && t("kpis.platesNote", { n: then.plates, range: compareLabel })
          }
        />
        <KpiCard
          id={`reports.food.${range.from}.${range.to}`}
          label={t("kpis.revenue")}
          icon={MoneyIcon}
          value={now?.revenue}
          format={format.moneyWhole}
          badge={now && then && !empty && <Delta value={change(now.revenue, then.revenue)} />}
          note={empty ? t("nothing") : t("kpis.revenueNote")}
        />
        <KpiCard
          id={`reports.best.${range.from}.${range.to}`}
          label={t("kpis.best")}
          icon={CrownSimpleIcon}
          value={items ? (best?.quantity ?? 0) : undefined}
          format={(n) => format.number(n)}
          text={best?.name ?? "—"}
          badge={bestBefore && <Delta value={change(best.quantity, bestBefore.quantity)} />}
          note={
            best
              ? t("kpis.bestNote", { n: best.quantity, amount: format.moneyWhole(best.revenue) })
              : items && t("nothing")
          }
          className="col-span-2 xl:col-span-1"
        />
      </div>

      {empty ? (
        <div className="rounded-xl bg-card shadow-md">
          <EmptyState
            icon={BowlFoodIcon}
            tone="slate"
            title={t("emptyTitle", { range: rangeLabel })}
          >
            {t("empty")}
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <TopTable items={items} revenue={now?.revenue ?? 0} url={url} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-1">
            <Panel title={t("categories.title")} subtitle={t("categories.sub")}>
              {items ? (
                <ul className="grid gap-4">
                  {categoryTotals(items).map((category) => (
                    <li key={category.category ?? ""} className="grid gap-1.5">
                      <div className="flex items-baseline gap-3 text-sm">
                        <span className="min-w-0 flex-1 truncate font-bold">
                          {category.category ?? t("categories.none")}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                          {format.moneyWhole(category.revenue)}
                        </span>
                        <span className="w-14 text-right font-bold tabular-nums">
                          {format.percent(category.share)}
                        </span>
                      </div>
                      <ShareBar value={category.share} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Skeleton className="h-48 rounded-lg" />
              )}
            </Panel>
            <Panel title={t("slow.title")} subtitle={t("slow.sub", { range: rangeLabel })}>
              {items && menu ? (
                <>
                  <ul className="grid gap-3">
                    {slowDishes(menu, items).map((dish) => (
                      <li key={dish.id} className="flex items-center gap-3">
                        <FoodThumb
                          src={dish.imageUrl}
                          category={dish.category ?? undefined}
                          className="size-10"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{dish.name}</p>
                          <p className="truncate text-xs text-muted-foreground tabular-nums">
                            {[
                              dish.category,
                              t("plates", { n: dish.quantity }),
                              format.moneyWhole(dish.revenue),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">{t("slow.note")}</p>
                </>
              ) : (
                <Skeleton className="h-36 rounded-lg" />
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function TopTable({
  items,
  revenue,
  url,
}: {
  items: TopFood[] | undefined;
  revenue: number;
  url: ReportUrl;
}) {
  const t = useTranslations("reports.dishes");
  const format = useFormat();
  const topRevenue = Math.max(...(items ?? []).map((item) => item.revenue), 1);

  return (
    <Panel
      flush
      title={t("top.title")}
      subtitle={t("top.sub")}
      action={
        <ReportCsv
          file="top-foods"
          range={url.range}
          query={{ limit: TOP_FOODS_LIMIT }}
          variant="outline"
          size="sm"
        />
      }
    >
      {!items ? (
        <div className="grid gap-2 px-5 sm:px-6">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-12 rounded-md" />
          ))}
        </div>
      ) : (
        <Table className="tabular-nums">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>{t("top.dish")}</TableHead>
              <TableHead className="text-right">{t("top.plates")}</TableHead>
              <TableHead className="hidden text-right sm:table-cell">{t("top.orders")}</TableHead>
              <TableHead className="text-right">{t("top.revenue")}</TableHead>
              <TableHead className="hidden w-44 md:table-cell">{t("top.share")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.slice(0, SHOWN).map((item, i) => {
              const share = revenue > 0 ? (item.revenue / revenue) * 100 : 0;
              // Bars measure against the biggest earner so small shares still read; the
              // percentage beside them is the real one.
              const bar = (item.revenue / topRevenue) * 100;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-bold text-muted-foreground">
                    {format.number(i + 1)}
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-40 items-center gap-3">
                      <FoodThumb
                        src={item.imageUrl}
                        category={item.category ?? undefined}
                        className="size-9"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-bold">{item.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.category}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {format.number(item.quantity)}
                  </TableCell>
                  <TableCell className="hidden text-right sm:table-cell">
                    {format.number(item.orders)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {format.moneyWhole(item.revenue)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-3">
                      <ShareBar value={bar} className="flex-1" />
                      <span className="w-12 text-right text-xs font-bold">
                        {format.percent(share)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
}
