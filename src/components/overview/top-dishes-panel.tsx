"use client";

import { ArrowRightIcon, BowlFoodIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { FoodThumb } from "@/components/food-thumb";
import { Panel } from "@/components/panel";
import { ShareBar } from "@/components/stats/share-bar";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { TopFood } from "@/lib/api/schema";
import { PAGE_PATHS } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

type TopDishesPanelProps = {
  foods: TopFood[] | undefined;
  /** Managers get a way into the full report. */
  reports: boolean;
  className?: string;
};

/** The month's best sellers by plates, each bar measured against the top one. */
export function TopDishesPanel({ foods, reports, className }: TopDishesPanelProps) {
  const t = useTranslations("overview.dishes");
  const format = useFormat();
  const most = Math.max(...(foods ?? []).map((food) => food.quantity), 1);

  return (
    <Panel
      className={className}
      title={t("title")}
      subtitle={t("sub")}
      action={
        reports && (
          <Link
            href={`${PAGE_PATHS.reports}?tab=dishes`}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2")}
          >
            {t("report")}
            <ArrowRightIcon />
          </Link>
        )
      }
    >
      {!foods ? (
        <div className="grid gap-4">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : foods.length === 0 ? (
        <EmptyState icon={BowlFoodIcon} tone="slate" title={t("emptyTitle")} className="py-8">
          {t("empty")}
        </EmptyState>
      ) : (
        <ol className="grid gap-4">
          {foods.map((food) => (
            <li key={food.id} className="flex items-center gap-3">
              <FoodThumb
                src={food.imageUrl}
                category={food.category ?? undefined}
                className="size-11"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">{food.name}</p>
                  <p className="text-sm font-bold tabular-nums">
                    {t("plates", { n: food.quantity })}
                  </p>
                </div>
                <div className="mt-0.5 flex items-baseline gap-3 text-xs text-muted-foreground">
                  <p className="min-w-0 flex-1 truncate">{food.category}</p>
                  <p className="tabular-nums">{format.moneyWhole(food.revenue)}</p>
                </div>
                <ShareBar value={(food.quantity / most) * 100} className="mt-2" />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
