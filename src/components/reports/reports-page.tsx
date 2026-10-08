"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { PageFrame } from "@/components/shell/page-frame";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { businessDate } from "@/lib/format";
import { can, PAGE_PATHS } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { DishesTab } from "./dishes-tab";
import { ExpensesTab } from "./expenses-tab";
import { RangeBar } from "./range-bar";
import { ReportCsv } from "./report-csv";
import { SalesTab } from "./sales-tab";
import { StaffTab } from "./staff-tab";
import { REPORT_TABS, useReportUrl, type ReportTab } from "./use-report-url";

/** Managers only: sales and profit, dishes, expenses and staff for any range of days. */
export function ReportsPage() {
  const t = useTranslations("reports");
  const format = useFormat();
  const session = useSession();
  const phone = useShellLayout() === "phone";
  const today = businessDate(useNow(60_000));
  const url = useReportUrl(today);
  if (session.status !== "authenticated") return null;

  const meta = t("meta", {
    range: format.dayRange(url.range.from, url.range.to, true),
    compare: format.dayRange(url.compare.from, url.compare.to),
  });

  return (
    <PageFrame
      page="reports"
      meta={meta}
      actions={
        <>
          {!phone && <ReportCsv file="orders" range={url.range} label={t("ordersCsv")} />}
          {can(session.user.role, "order.create") && (
            <Link href={PAGE_PATHS.newOrder} className={buttonVariants()}>
              <PlusIcon weight="bold" />
              {t("newOrder")}
            </Link>
          )}
        </>
      }
    >
      <Tabs value={url.tab} onValueChange={(next) => url.setTab(next as ReportTab)}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <TabsList className="-mx-4 min-w-0 px-4 md:mx-0 md:px-0">
            {REPORT_TABS.map((tab) => (
              <TabsTab key={tab} value={tab}>
                {t(`tabs.${tab}`)}
              </TabsTab>
            ))}
          </TabsList>
          <RangeBar url={url} today={today} grouping={url.tab === "sales"} className="mb-1.5" />
        </div>
        <TabsPanel value="sales">
          <SalesTab url={url} today={today} />
        </TabsPanel>
        <TabsPanel value="dishes">
          <DishesTab url={url} />
        </TabsPanel>
        <TabsPanel value="expenses">
          <ExpensesTab url={url} />
        </TabsPanel>
        <TabsPanel value="staff">
          <StaffTab url={url} />
        </TabsPanel>
      </Tabs>
    </PageFrame>
  );
}
