"use client";

import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import type { OrderOut } from "@/lib/api/schema";
import { shortOrderNumber } from "@/lib/format";
import type { OrderSort } from "@/lib/orders";
import { isClosed } from "@/lib/permissions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { ItemsLine, PlacedAt, PlacedNote, useOrderWhere } from "./order-bits";
import { OrderRowMenu } from "./order-row-menu";
import { OrderStatusPill } from "./order-status";

type OrdersTableProps = {
  orders: OrderOut[];
  now: number;
  sort: OrderSort;
  onSort: (sort: OrderSort) => void;
};

// Narrow screens drop the waiter and the time before anything else.
const wide = "hidden xl:table-cell";

export function OrdersTable({ orders, now, sort, onSort }: OrdersTableProps) {
  const t = useTranslations("orders");
  const format = useFormat();
  const where = useOrderWhere();

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">{t("columns.order")}</TableHead>
          <TableHead className="w-[150px]">{t("columns.table")}</TableHead>
          <TableHead>{t("columns.items")}</TableHead>
          <TableHead className={cn(wide, "w-[130px]")}>{t("columns.waiter")}</TableHead>
          <TableHead className={cn(wide, "w-[120px]")} aria-sort={ariaSort("createdAt", sort)}>
            <SortButton field="createdAt" sort={sort} onSort={onSort}>
              {t("columns.placed")}
            </SortButton>
          </TableHead>
          <TableHead className="w-[150px]">{t("columns.status")}</TableHead>
          <TableHead className="w-[120px] text-right" aria-sort={ariaSort("total", sort)}>
            <SortButton field="total" sort={sort} onSort={onSort} className="ml-auto">
              {t("columns.total")}
            </SortButton>
          </TableHead>
          <TableHead className="w-14">
            <span className="sr-only">{t("columns.actions")}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => {
          const place = where(order);
          return (
            <TableRow key={order.id} className="relative">
              <TableCell>
                <Link
                  href={`/orders/${order.id}`}
                  className="block outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:ring-3 focus-visible:after:ring-ring/40 focus-visible:after:ring-inset"
                >
                  <span className="block text-md font-bold tabular-nums">
                    {format.number(Number(shortOrderNumber(order.orderNumber)))}
                  </span>
                  <span className="block text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {order.orderNumber}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <p className="truncate font-medium">{place.title}</p>
                <p className="truncate text-xs text-muted-foreground">{place.detail}</p>
              </TableCell>
              <TableCell>
                <p className="font-medium">{t("itemCount", { n: order.itemCount })}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <ItemsLine order={order} />
                </p>
              </TableCell>
              <TableCell className={wide}>
                <p className="truncate font-medium">{order.waiter?.fullName ?? t("guest")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <WaiterNote order={order} />
                </p>
              </TableCell>
              <TableCell className={wide}>
                <p className="font-medium whitespace-nowrap tabular-nums">
                  <PlacedAt value={order.createdAt} />
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <PlacedNote order={order} now={now} />
                </p>
              </TableCell>
              <TableCell>
                <OrderStatusPill status={order.status} />
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-bold tabular-nums",
                  order.status === "cancelled" && "text-muted-foreground line-through",
                )}
              >
                {format.money(order.total)}
              </TableCell>
              <TableCell className="text-right">
                <OrderRowMenu order={order} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

/** Under the waiter: why it was cancelled, what's still owed, or where a guest ordered from. */
function WaiterNote({ order }: { order: OrderOut }) {
  const t = useTranslations("orders");
  const format = useFormat();
  if (order.status === "cancelled") return <>{order.cancelReason}</>;
  if (!isClosed(order) && order.amountPaid > 0 && order.balanceDue > 0) {
    return <>{t("due", { amount: format.money(order.balanceDue) })}</>;
  }
  if (order.source !== "staff") return <>{t(`via.${order.source}`)}</>;
  return null;
}

type SortButtonProps = {
  field: "createdAt" | "total";
  sort: OrderSort;
  onSort: (sort: OrderSort) => void;
  className?: string;
  children: React.ReactNode;
};

const ariaSort = (field: "createdAt" | "total", sort: OrderSort) =>
  sort === `-${field}` ? "descending" : sort === field ? "ascending" : undefined;

/** Newest or highest first on the first click, then the other way. */
function SortButton({ field, sort, onSort, className, children }: SortButtonProps) {
  const descending = sort === `-${field}`;
  const active = descending || sort === field;
  const Icon = !active ? CaretUpDownIcon : descending ? CaretDownIcon : CaretUpIcon;
  return (
    <button
      type="button"
      onClick={() => onSort(descending ? field : `-${field}`)}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded-xs px-1 uppercase outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40",
        active && "text-foreground",
        className,
      )}
    >
      {children}
      <Icon weight="bold" className="size-3" />
    </button>
  );
}
