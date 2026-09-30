"use client";

import { useState } from "react";
import {
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
  UserCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { IconInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { tablesQuery, waitersQuery } from "@/lib/api/queries";
import type { UserRole } from "@/lib/api/schema";
import { DATE_RANGES, ORDER_SORTS, ORDER_SOURCES, tabIgnoresDate } from "@/lib/orders";
import { cn } from "@/lib/utils";
import { hasFilters, type OrderUrlChange, type OrderUrlState } from "./use-order-filters";

type ToolbarProps = {
  url: OrderUrlState;
  role: UserRole;
  search: string;
  onSearch: (value: string) => void;
  onChange: (change: OrderUrlChange) => void;
  onClear: () => void;
  /** Waiters only see "Mine" once their staff record has been found. */
  canFilterMine: boolean;
  className?: string;
};

// A filter that's set reads in orange, so it's obvious why the list is short.
const setClass =
  "border-primary/30 bg-primary-soft text-primary-soft-foreground hover:bg-brand-track";

export function OrdersToolbar(props: ToolbarProps) {
  const t = useTranslations("orders.filters");
  const { url, search, onSearch, onClear } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeCount(url);

  return (
    <div className={cn("flex items-center gap-2.5 p-4 md:px-5", props.className)}>
      <div className="min-w-0 flex-1 lg:max-w-80">
        <IconInput
          icon={MagnifyingGlassIcon}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          type="search"
          inputMode="search"
          className="w-full"
          end={
            search && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
                aria-label={t("clearSearch")}
                onClick={() => onSearch("")}
              >
                <XIcon />
              </Button>
            )
          }
        />
      </div>

      <div className="hidden min-w-0 flex-wrap items-center gap-2.5 lg:flex">
        <Filters {...props} />
        {hasFilters(url) && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            {t("clear")}
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        className={cn("shrink-0 lg:hidden", active > 0 && setClass)}
        onClick={() => setSheetOpen(true)}
      >
        <SlidersHorizontalIcon />
        {active > 0 ? t("buttonCount", { n: active }) : t("button")}
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
            <SheetDescription className="sr-only">{t("hint")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="grid gap-4">
            <Filters {...props} stacked />
            <SortSelect {...props} />
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" onClick={onClear} disabled={!hasFilters(url)}>
              {t("clear")}
            </Button>
            <Button onClick={() => setSheetOpen(false)}>{t("done")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

const activeCount = (url: OrderUrlState) =>
  [url.source.length > 0, url.table, url.waiter, url.mine, url.range !== "today"].filter(Boolean)
    .length;

/** Inline in the toolbar on wide screens; labelled fields in the sheet on narrow ones. */
function Filters({
  url,
  role,
  onChange,
  canFilterMine,
  stacked = false,
}: ToolbarProps & { stacked?: boolean }) {
  const t = useTranslations("orders");
  const { data: tables = [] } = useQuery(tablesQuery);
  const isManager = role === "manager" || role === "admin";
  const { data: waiters = [] } = useQuery({ ...waitersQuery, enabled: isManager });
  const source = url.source[0] ?? null;
  const showRange = !tabIgnoresDate(url.tab);

  const wrap = (label: string, control: React.ReactNode) =>
    stacked ? (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        {control}
      </Field>
    ) : (
      control
    );
  const trigger = (isSet: boolean) => cn(stacked && "w-full", isSet && !stacked && setClass);

  return (
    <>
      {wrap(
        t("filters.source"),
        <Select
          value={source}
          onValueChange={(value) => onChange({ source: value ? [value] : null })}
          items={[
            { value: null, label: stacked ? t("filters.allSources") : t("filters.source") },
            ...ORDER_SOURCES.map((value) => ({
              value,
              label: stacked
                ? t(`sources.${value}`)
                : t("filters.sourceIs", { source: t(`sources.${value}`) }),
            })),
          ]}
        >
          <SelectTrigger className={trigger(source !== null)} aria-label={t("filters.source")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>{t("filters.allSources")}</SelectItem>
            {ORDER_SOURCES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`sources.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}

      {wrap(
        t("filters.table"),
        <Select
          value={url.table}
          onValueChange={(value) => onChange({ table: value })}
          items={[
            { value: null, label: stacked ? t("filters.allTables") : t("filters.table") },
            ...tables.map((table) => ({
              value: table.id,
              label: stacked ? table.number : t("filters.tableIs", { table: table.number }),
            })),
          ]}
        >
          <SelectTrigger className={trigger(url.table !== null)} aria-label={t("filters.table")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={null}>{t("filters.allTables")}</SelectItem>
            {tables.map((table) => (
              <SelectItem key={table.id} value={table.id}>
                {table.number}
                {table.location && <span className="text-muted-foreground">{table.location}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>,
      )}

      {showRange &&
        wrap(
          t("filters.date"),
          <Select
            value={url.range}
            onValueChange={(value) => value && onChange({ range: value })}
            items={DATE_RANGES.map((value) => ({ value, label: t(`ranges.${value}`) }))}
          >
            <SelectTrigger
              className={trigger(url.range !== "today")}
              aria-label={t("filters.date")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`ranges.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}

      {isManager &&
        wrap(
          t("filters.waiter"),
          <Select
            value={url.waiter}
            onValueChange={(value) => onChange({ waiter: value })}
            items={[
              { value: null, label: stacked ? t("filters.allWaiters") : t("filters.waiter") },
              ...waiters.map((waiter) => ({ value: waiter.id, label: waiter.fullName })),
            ]}
          >
            <SelectTrigger
              className={trigger(url.waiter !== null)}
              aria-label={t("filters.waiter")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>{t("filters.allWaiters")}</SelectItem>
              {waiters.map((waiter) => (
                <SelectItem key={waiter.id} value={waiter.id}>
                  {waiter.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>,
        )}

      {role === "waiter" && canFilterMine && (
        <Button
          variant="outline"
          aria-pressed={url.mine}
          onClick={() => onChange({ mine: !url.mine })}
          className={cn(stacked && "justify-start", url.mine && setClass)}
        >
          <UserCircleIcon weight="duotone" />
          {t("filters.mine")}
        </Button>
      )}
    </>
  );
}

function SortSelect({ url, onChange }: ToolbarProps) {
  const t = useTranslations("orders");
  return (
    <Field>
      <FieldLabel>{t("filters.sort")}</FieldLabel>
      <Select
        value={url.sort}
        onValueChange={(value) => value && onChange({ sort: value })}
        items={ORDER_SORTS.map((value) => ({ value, label: t(`sorts.${value}`) }))}
      >
        <SelectTrigger className="w-full" aria-label={t("filters.sort")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_SORTS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`sorts.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
