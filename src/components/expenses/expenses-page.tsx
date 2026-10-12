"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  CalendarBlankIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CloudSlashIcon,
  CoinsIcon,
  DotsThreeIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  PaperclipIcon,
  PencilSimpleIcon,
  PlusIcon,
  ReceiptIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { ReportCsv } from "@/components/reports/report-csv";
import { PageFrame } from "@/components/shell/page-frame";
import { Delta } from "@/components/stats/delta";
import { KpiCard } from "@/components/stats/kpi-card";
import { ShareBar } from "@/components/stats/share-bar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { expensesQuery } from "@/lib/api/queries";
import type { ExpenseOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { matchesExpense, monthRange, shiftMonth, spendByCategory } from "@/lib/expenses";
import { businessDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import { change, compareRange, rangeDays } from "@/lib/reports";
import { useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { DeleteExpenseDialog, ReceiptDialog } from "./expense-dialogs";
import { EXPENSE_ICONS } from "./expense-look";
import { ExpenseSheet, type ExpenseSheetStart } from "./expense-sheet";
import { useExpensesUrl } from "./use-expenses-url";

type Dialog = { kind: "delete" | "receipt"; expense: ExpenseOut };

const wide = "hidden xl:table-cell";

/** A month of spending: the total against last month, where it went, and every entry. */
export function ExpensesPage() {
  const t = useTranslations("expenses");
  const tCategory = useTranslations("expenseCategories");
  const format = useFormat();
  const errorText = useErrorText();
  const session = useSession();
  const phone = useShellLayout() === "phone";
  const today = businessDate(useNow(60_000));
  const url = useExpensesUrl(today.slice(0, 7));
  const range = monthRange(url.month, today);
  const compare = compareRange(range);
  const expenses = useQuery(expensesQuery(range));
  const before = useQuery(expensesQuery(compare)).data;
  const [sheet, setSheet] = useState<ExpenseSheetStart>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  if (session.status !== "authenticated") return null;

  const role = session.user.role;
  const canDelete = can(role, "expense.delete");
  const all = expenses.data ?? [];
  const { total, categories } = spendByCategory(all);
  const previous = before ? spendByCategory(before).total : undefined;
  const shown = all.filter((expense) =>
    matchesExpense(expense, {
      categories: url.category ? [url.category] : [],
      search: url.search,
    }),
  );
  const monthName = format.period(range.from, range.to, "month");
  const perDay = total / rangeDays(range);
  const biggest = categories[0];
  const thisMonth = url.month === today.slice(0, 7);
  const loading = !expenses.data;

  const rowMenu = (expense: ExpenseOut) => (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative z-10 text-muted-foreground"
            aria-label={t("rowMenu", { title: expense.title })}
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => setSheet({ expense })}>
          <PencilSimpleIcon />
          {t("edit")}
        </DropdownMenuItem>
        {expense.receiptUrl && (
          <DropdownMenuItem onClick={() => setDialog({ kind: "receipt", expense })}>
            <ReceiptIcon />
            {t("viewReceipt")}
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDialog({ kind: "delete", expense })}
            >
              <TrashIcon />
              {t("remove")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const title = (expense: ExpenseOut) => (
    <button
      type="button"
      onClick={() => setSheet({ expense })}
      className="block w-full min-w-0 text-left outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/40 focus-visible:after:ring-inset"
    >
      <span className="flex items-center gap-1.5">
        <span className="truncate font-bold">{expense.title}</span>
        {expense.receiptUrl && (
          <PaperclipIcon
            role="img"
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-label={t("hasReceipt")}
          />
        )}
      </span>
      {expense.paidTo && (
        <span className="block truncate text-xs text-muted-foreground">{expense.paidTo}</span>
      )}
    </button>
  );

  let list: React.ReactNode;
  if (expenses.isError && !expenses.data) {
    list = (
      <EmptyState
        icon={CloudSlashIcon}
        tone="slate"
        title={t("failed")}
        action={
          <Button variant="outline" onClick={() => void expenses.refetch()}>
            <ArrowsClockwiseIcon />
            {t("retry")}
          </Button>
        }
      >
        {errorText.message(expenses.error)}
      </EmptyState>
    );
  } else if (loading) {
    list = (
      <div aria-busy className="grid gap-2 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  } else if (all.length === 0) {
    list = (
      <EmptyState
        icon={ReceiptIcon}
        title={t("emptyTitle", { month: monthName })}
        action={
          <Button onClick={() => setSheet({})}>
            <PlusIcon weight="bold" />
            {t("add")}
          </Button>
        }
      >
        {t("empty")}
      </EmptyState>
    );
  } else if (shown.length === 0) {
    list = <EmptyState icon={FunnelSimpleIcon} tone="slate" title={t("noMatch")} />;
  } else if (phone) {
    list = (
      <ul className="animate-appear divide-y divide-border">
        {shown.map((expense) => {
          const Icon = EXPENSE_ICONS[expense.category];
          return (
            <li key={expense.id} className="relative flex items-center gap-3 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon weight="duotone" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                {title(expense)}
                <span className="block text-xs text-muted-foreground">
                  {format.shortDate(expense.expenseDate)} · {tCategory(expense.category)}
                </span>
              </div>
              <span className="font-bold tabular-nums">{format.money(expense.amount)}</span>
              {rowMenu(expense)}
            </li>
          );
        })}
      </ul>
    );
  } else {
    list = (
      <Table className="table-fixed animate-appear">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">{t("columns.date")}</TableHead>
            <TableHead>{t("columns.expense")}</TableHead>
            <TableHead className="w-[160px]">{t("columns.category")}</TableHead>
            <TableHead className={cn(wide, "w-[150px]")}>{t("columns.by")}</TableHead>
            <TableHead className="w-[140px] text-right">{t("columns.amount")}</TableHead>
            <TableHead className="w-14">
              <span className="sr-only">{t("columns.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((expense) => {
            const Icon = EXPENSE_ICONS[expense.category];
            return (
              <TableRow key={expense.id} className="relative">
                <TableCell className="text-muted-foreground tabular-nums">
                  {format.shortDate(expense.expenseDate)}
                </TableCell>
                <TableCell>{title(expense)}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Icon weight="duotone" className="size-4 shrink-0" />
                    <span className="truncate">{tCategory(expense.category)}</span>
                  </span>
                </TableCell>
                <TableCell className={cn(wide, "truncate text-muted-foreground")}>
                  {expense.createdBy?.fullName ?? "–"}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">
                  {format.money(expense.amount)}
                </TableCell>
                <TableCell className="text-right">{rowMenu(expense)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  return (
    <PageFrame
      page="expenses"
      meta={t("meta", { month: monthName })}
      actions={
        <>
          {can(role, "reports.view") && (
            <ReportCsv file="expenses" range={range} variant="outline" />
          )}
          <Button onClick={() => setSheet({ category: url.category })}>
            <PlusIcon weight="bold" />
            {t("add")}
          </Button>
        </>
      }
    >
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-card p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("previousMonth")}
              onClick={() => url.setMonth(shiftMonth(url.month, -1))}
            >
              <CaretLeftIcon />
            </Button>
            <span className="min-w-36 px-2 text-center text-sm font-bold tabular-nums">
              {monthName}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("nextMonth")}
              disabled={thisMonth}
              onClick={() => url.setMonth(shiftMonth(url.month, 1))}
            >
              <CaretRightIcon />
            </Button>
          </div>
          {!thisMonth && (
            <Button variant="ghost" size="sm" onClick={() => url.setMonth(today.slice(0, 7))}>
              {t("thisMonth")}
            </Button>
          )}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <KpiCard
              id={`expenses.${url.month}`}
              label={t("spent", { month: monthName })}
              icon={CoinsIcon}
              value={loading ? undefined : total}
              format={format.money}
              badge={
                previous !== undefined &&
                total > 0 && <Delta value={change(total, previous)} goodWhen="down" />
              }
              note={
                previous !== undefined &&
                t("compare", {
                  amount: format.moneyWhole(previous),
                  range: format.dayRange(compare.from, compare.to),
                })
              }
            />
            <KpiCard
              id={`expenses.daily.${url.month}`}
              label={t("perDay")}
              icon={CalendarBlankIcon}
              value={loading ? undefined : perDay}
              format={format.moneyWhole}
              note={
                biggest &&
                t("biggest", {
                  category: tCategory(biggest.category),
                  share: format.percent(biggest.share),
                })
              }
            />
          </div>

          <Panel
            title={t("byCategory")}
            subtitle={url.category ? t("byCategoryFiltered") : t("byCategoryHint")}
          >
            {loading ? (
              <div className="grid gap-3">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-8" />
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>
            ) : (
              <ul className="-mx-2 grid animate-appear gap-1">
                {categories.map((share) => {
                  const Icon = EXPENSE_ICONS[share.category];
                  const picked = url.category === share.category;
                  return (
                    <li key={share.category}>
                      <button
                        type="button"
                        aria-pressed={picked}
                        onClick={() => url.setCategory(picked ? null : share.category)}
                        className={cn(
                          "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_6.5rem] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-(--duration-fast) outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/40 sm:grid-cols-[1.25rem_minmax(6rem,9rem)_minmax(0,1fr)_6.5rem]",
                          picked &&
                            "bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft",
                          url.category && !picked && "opacity-60",
                        )}
                      >
                        <Icon weight="duotone" className="size-5" />
                        <span className="truncate font-medium">{tCategory(share.category)}</span>
                        <ShareBar
                          value={share.share}
                          className="col-span-2 col-start-2 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1"
                        />
                        <span className="col-start-3 row-start-1 text-right font-bold tabular-nums sm:col-start-4">
                          {format.moneyWhole(share.amount)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <section className="min-w-0 overflow-hidden rounded-xl bg-card shadow-md">
          <div className="flex flex-wrap items-center gap-2.5 p-4 md:px-5">
            <div className="w-full sm:w-72">
              <IconInput
                icon={MagnifyingGlassIcon}
                type="search"
                value={url.search}
                onChange={(event) => url.setSearch(event.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="w-full"
              />
            </div>
            {url.category && (
              <Chip pressed onClick={() => url.setCategory(null)}>
                {tCategory(url.category)}
                <XIcon role="img" aria-label={t("clearCategory")} />
              </Chip>
            )}
            {expenses.data && (
              <span className="text-sm text-muted-foreground sm:ml-auto">
                {t("count", { n: shown.length })}
              </span>
            )}
          </div>
          <div className="border-t border-border">{list}</div>
        </section>
      </div>

      <ExpenseSheet
        start={sheet}
        onClose={() => setSheet(null)}
        onDelete={
          canDelete
            ? (expense) => {
                setSheet(null);
                setDialog({ kind: "delete", expense });
              }
            : undefined
        }
      />
      {dialog?.kind === "delete" && (
        <DeleteExpenseDialog expense={dialog.expense} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "receipt" && (
        <ReceiptDialog expense={dialog.expense} onClose={() => setDialog(null)} />
      )}
    </PageFrame>
  );
}
