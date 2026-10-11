"use client";

import {
  ArrowsClockwiseIcon,
  CloudSlashIcon,
  MagnifyingGlassIcon,
  ReceiptIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ordersQuery } from "@/lib/api/queries";
import type { UserRole } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { listItem, useViewKey } from "@/lib/motion";
import { ordersQuery as toApiQuery } from "@/lib/orders";
import { pageRange } from "@/lib/pagination";
import { useDebounced } from "@/lib/use-debounced";
import { useMyWaiterId } from "@/lib/use-my-waiter";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { OrderListCard } from "./order-list-card";
import { OrdersTable } from "./orders-table";
import { OrdersToolbar } from "./orders-toolbar";
import {
  hasFilters,
  PAGE_SIZES,
  toFilters,
  useOrderUrl,
  type OrderUrlChange,
} from "./use-order-filters";

const CLEARED = {
  q: null,
  source: null,
  table: null,
  range: null,
  waiter: null,
  mine: null,
  page: null,
};

export function OrdersList({ role }: { role: UserRole }) {
  const t = useTranslations("orders");
  const errorText = useErrorText();
  const phone = useShellLayout() === "phone";
  const now = useNow(30_000);
  const [url, setUrl] = useOrderUrl();
  const myWaiterId = useMyWaiterId();

  // The box and the URL follow every key; the list waits until typing pauses.
  const search = useDebounced(url.q, 300);
  const filters = { ...toFilters(url, myWaiterId), search };
  const waitingForMe = url.mine && myWaiterId === null;
  const query = useQuery({ ...ordersQuery(toApiQuery(filters, now)), enabled: !waitingForMe });
  const page = query.data;
  const view = useViewKey(JSON.stringify(filters), Boolean(page) && !query.isPlaceholderData);

  const change = (next: OrderUrlChange) => void setUrl({ ...next, page: null });
  const clear = () => void setUrl(CLEARED);

  let body: React.ReactNode;
  if (!page && query.isError) {
    body = (
      <EmptyState
        icon={CloudSlashIcon}
        tone="slate"
        title={t("failed.title")}
        action={
          <Button variant="outline" onClick={() => void query.refetch()}>
            <ArrowsClockwiseIcon />
            {t("failed.retry")}
          </Button>
        }
      >
        {errorText.message(query.error)}
      </EmptyState>
    );
  } else if (!page) {
    body = phone ? <CardSkeletons /> : <RowSkeletons />;
  } else if (page.items.length === 0) {
    body = hasFilters(url) ? (
      <EmptyState
        icon={MagnifyingGlassIcon}
        title={t("empty.filteredTitle")}
        action={
          <Button variant="outline" onClick={clear}>
            <ArrowsClockwiseIcon />
            {t("filters.clear")}
          </Button>
        }
      >
        {t("empty.filteredBody")}
      </EmptyState>
    ) : (
      <EmptyState icon={ReceiptIcon} tone="slate" title={t(`empty.${url.tab}.title`)}>
        {t(`empty.${url.tab}.body`)}
      </EmptyState>
    );
  } else {
    body = phone ? (
      <ul key={view} className="grid animate-appear grid-cols-1 gap-3">
        <AnimatePresence initial={false} mode="popLayout">
          {page.items.map((order) => (
            <m.li key={order.id} {...listItem}>
              <OrderListCard order={order} />
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    ) : (
      <OrdersTable
        key={view}
        orders={page.items}
        now={now}
        sort={url.sort}
        onSort={(sort) => change({ sort })}
      />
    );
  }

  const range = page ? pageRange(page.page, page.size, page.total) : null;
  const footer = page && page.total > 0 && (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 md:border-t md:border-border md:px-6 md:py-4">
      <p className="text-sm text-muted-foreground tabular-nums">
        {t("showing", { from: range!.from, to: range!.to, total: page.total })}
      </p>
      <div className="flex items-center gap-2.5">
        <Select
          value={url.size}
          onValueChange={(size) => size && change({ size })}
          items={PAGE_SIZES.map((size) => ({ value: size, label: t("perPage", { n: size }) }))}
        >
          <SelectTrigger className="hidden sm:inline-flex" aria-label={t("perPageLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={size}>
                {t("perPage", { n: size })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Pagination
          page={page.page}
          pages={page.pages}
          onPageChange={(next) => {
            void setUrl({ page: next });
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    </div>
  );

  const toolbar = (
    <OrdersToolbar
      url={url}
      role={role}
      search={url.q}
      onSearch={(q) => change({ q: q || null })}
      onChange={change}
      onClear={clear}
      canFilterMine={myWaiterId !== null}
      className={phone ? "pt-0" : undefined}
    />
  );

  // Phones lay the cards on the ground; larger screens hold the table in one card.
  return phone ? (
    <div className="-mx-4">
      {toolbar}
      <div className={cn("px-4 transition-opacity", query.isPlaceholderData && "opacity-60")}>
        {body}
        {footer}
      </div>
    </div>
  ) : (
    <section className="overflow-hidden rounded-xl bg-card shadow-md">
      {toolbar}
      <div
        className={cn(
          "transition-opacity duration-(--duration-base)",
          query.isPlaceholderData && "opacity-60",
        )}
      >
        {body}
      </div>
      {footer}
    </section>
  );
}

function RowSkeletons() {
  return (
    <div aria-busy className="border-t border-border">
      <div className="h-11 bg-muted" />
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-6 border-b border-border px-6 py-4 last:border-0"
        >
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="hidden h-6 w-24 rounded-full xl:block" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

function CardSkeletons() {
  return (
    <div aria-busy className="grid grid-cols-1 gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[104px] rounded-xl bg-card" />
      ))}
    </div>
  );
}
