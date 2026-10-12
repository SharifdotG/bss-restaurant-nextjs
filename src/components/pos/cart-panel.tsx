"use client";

import { useState } from "react";
import {
  ArmchairIcon,
  ChefHatIcon,
  PencilSimpleIcon,
  ShoppingBagIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { restaurantQuery, waitersQuery } from "@/lib/api/queries";
import type { FoodOut, OrderType } from "@/lib/api/schema";
import type { FloorTable } from "@/lib/floor";
import { toTaka } from "@/lib/money";
import {
  cartTotals,
  draftProblem,
  setLineNote,
  setLineQuantity,
  type CartLine,
  type Draft,
} from "@/lib/pos";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";

export type CartProps = {
  draft: Draft;
  update: (change: Partial<Draft>) => void;
  byId: ReadonlyMap<number, FoodOut>;
  prices: ReadonlyMap<number, number>;
  /** Adding to an existing order: the type and table are already settled. */
  adding: { n: string; where: string } | null;
  tables: FloorTable[];
  onPickTable: (tableId: number) => void;
  canPickWaiter: boolean;
  onClear: () => void;
  onSend: () => void;
  sending: boolean;
  error: string | null;
};

/** Who and where, what's in it, and what it comes to. */
export function CartHeader(props: CartProps) {
  const t = useTranslations("pos");
  const { draft, update, adding } = props;

  return (
    <div className="grid gap-3">
      {!adding && (
        <Segmented<OrderType>
          aria-label={t("orderType")}
          value={draft.orderType}
          onValueChange={(orderType) =>
            update(orderType === "takeaway" ? { orderType, tableId: null } : { orderType })
          }
          options={[
            { value: "dine_in", label: t("dineIn") },
            { value: "takeaway", label: t("takeaway") },
          ]}
          className="grid grid-cols-2 [&>button]:justify-center"
        />
      )}
      {!adding && draft.orderType === "dine_in" && <TablePicker {...props} />}
      {!adding && draft.orderType === "takeaway" && (
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            value={draft.customerName}
            onChange={(event) => update({ customerName: event.target.value })}
            placeholder={t("customerName")}
            aria-label={t("customerName")}
            maxLength={100}
            autoComplete="off"
          />
          <Input
            value={draft.customerPhone}
            onChange={(event) => update({ customerPhone: event.target.value })}
            placeholder={t("customerPhone")}
            aria-label={t("customerPhone")}
            inputMode="tel"
            type="tel"
            maxLength={20}
            autoComplete="off"
          />
        </div>
      )}
      {!adding && props.canPickWaiter && <WaiterPicker {...props} />}
    </div>
  );
}

function TablePicker({ draft, tables, onPickTable }: CartProps) {
  const t = useTranslations("pos");
  const format = useFormat();
  const describe = (entry: FloorTable) => {
    const { state } = entry;
    if (state.kind === "order") {
      return t("tableBusy", { n: format.orderNo(state.order.orderNumber) });
    }
    if (state.kind === "booked")
      return t("tableBooked", { time: format.time(state.booking.startsAt) });
    return t("tableFree");
  };
  const label = (entry: FloorTable) =>
    [entry.table.number, entry.table.location, t("seats", { n: entry.table.seats })]
      .filter(Boolean)
      .join(" · ");

  return (
    <Select
      value={draft.tableId}
      onValueChange={(tableId) => tableId !== null && onPickTable(tableId)}
      items={tables.map((entry) => ({ value: entry.table.id, label: label(entry) }))}
    >
      <SelectTrigger className="h-11 w-full justify-start" aria-label={t("table")}>
        <ArmchairIcon weight="duotone" className="text-muted-foreground" />
        <SelectValue placeholder={t("pickTable")} className="flex-1 text-left" />
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {tables.map((entry) => (
          <SelectItem key={entry.table.id} value={entry.table.id}>
            <span className="w-9 font-bold">{entry.table.number}</span>
            <span className="text-muted-foreground">{describe(entry)}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function WaiterPicker({ draft, update }: CartProps) {
  const t = useTranslations("pos");
  const { data: waiters = [] } = useQuery(waitersQuery);
  return (
    <Select
      value={draft.waiterId}
      onValueChange={(waiterId) => update({ waiterId })}
      items={[
        { value: null, label: t("servedByMe") },
        ...waiters.map((waiter) => ({
          value: waiter.id,
          label: t("servedBy", { name: waiter.fullName }),
        })),
      ]}
    >
      <SelectTrigger className="w-full" aria-label={t("waiter")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={null}>{t("servedByMe")}</SelectItem>
        {waiters.map((waiter) => (
          <SelectItem key={waiter.id} value={waiter.id}>
            {waiter.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** The lines, each with its stepper and an optional note for the kitchen. */
export function CartLines({ draft, update, byId, className }: CartProps & { className?: string }) {
  const t = useTranslations("pos");
  if (draft.lines.length === 0) {
    return (
      <div className={cn("grid place-items-center px-6 py-12 text-center", className)}>
        <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
          <ShoppingBagIcon weight="duotone" className="size-6" />
        </span>
        <p className="mt-3 font-bold">{t("emptyTitle")}</p>
        <p className="mt-1 max-w-[30ch] text-sm text-muted-foreground">{t("emptyBody")}</p>
      </div>
    );
  }
  return (
    <ul className={cn("divide-y divide-border", className)}>
      {draft.lines.map((line, index) => (
        <CartLineRow
          key={`${line.foodId}-${line.notes ?? ""}`}
          line={line}
          food={byId.get(line.foodId)}
          onQuantity={(quantity) =>
            update({ lines: setLineQuantity(draft.lines, index, quantity) })
          }
          onNote={(note) => update({ lines: setLineNote(draft.lines, index, note) })}
        />
      ))}
    </ul>
  );
}

type LineRowProps = {
  line: CartLine;
  food: FoodOut | undefined;
  onQuantity: (quantity: number) => void;
  onNote: (note: string) => void;
};

function CartLineRow({ line, food, onQuantity, onNote }: LineRowProps) {
  const t = useTranslations("pos");
  const format = useFormat();
  const [editing, setEditing] = useState(false);
  const name = food?.name ?? t("unknownDish");

  return (
    <li className="flex items-start gap-3 py-3">
      <QtyStepper
        size="sm"
        value={line.quantity}
        removable
        onChange={onQuantity}
        label={t("quantityOf", { name })}
      />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-sm font-bold tabular-nums">
            {format.money((food?.finalPrice ?? 0) * line.quantity)}
          </p>
        </div>
        {editing ? (
          <Input
            autoFocus
            defaultValue={line.notes ?? ""}
            maxLength={255}
            placeholder={t("notePlaceholder")}
            aria-label={t("noteFor", { name })}
            className="mt-1.5 h-8 text-sm"
            onBlur={(event) => {
              onNote(event.target.value);
              setEditing(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
              if (event.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "hit-target relative mt-0.5 inline-flex max-w-full items-center gap-1 rounded-xs text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              line.notes
                ? "font-medium text-tone-orange-text"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <PencilSimpleIcon weight="duotone" className="size-3.5 shrink-0" />
            <span className="truncate">{line.notes ?? t("addNote")}</span>
          </button>
        )}
      </div>
    </li>
  );
}

/** Subtotal, service charge, VAT and the send button. */
export function CartFooter({ draft, prices, adding, onSend, sending, error }: CartProps) {
  const t = useTranslations("pos");
  const format = useFormat();
  const { data: restaurant } = useQuery(restaurantQuery);
  const rates = {
    serviceChargePercent: restaurant?.serviceChargePercent ?? 0,
    vatPercent: restaurant?.vatPercent ?? 0,
  };
  const totals = cartTotals(draft.lines, prices, draft.orderType, rates);
  const problem = adding ? (draft.lines.length ? null : "empty") : draftProblem(draft);
  const money = (paisa: number) => format.money(toTaka(paisa));

  return (
    <div className="grid gap-3">
      {error && (
        <Alert tone="red" icon={WarningCircleIcon} title={t("sendFailed")}>
          {error}
        </Alert>
      )}
      <dl className="grid gap-1 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <dt>{t("subtotal", { n: totals.items })}</dt>
          <dd className="tabular-nums">{money(totals.food)}</dd>
        </div>
        {totals.service > 0 && (
          <div className="flex justify-between">
            <dt>{t("serviceCharge", { rate: format.number(rates.serviceChargePercent) })}</dt>
            <dd className="tabular-nums">{money(totals.service)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt>{t("vat", { rate: format.number(rates.vatPercent) })}</dt>
          <dd className="tabular-nums">{money(totals.vat)}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between text-foreground">
          <dt className="text-md font-bold">{t("total")}</dt>
          <dd className="text-2xl font-bold tabular-nums">{money(totals.total)}</dd>
        </div>
      </dl>
      <Button
        size="lg"
        className="h-13 w-full text-md"
        disabled={problem !== null || sending}
        onClick={onSend}
      >
        <ChefHatIcon weight="duotone" className="size-5" />
        {sending ? t("sending") : adding ? t("addToOrder", { n: adding.n }) : t("send")}
      </Button>
      {problem === "table" && (
        <p className="-mt-1 text-center text-xs text-muted-foreground">{t("needTable")}</p>
      )}
    </div>
  );
}

/** The cart's top line: what this is and a way to start over. */
export function CartTitle({ draft, adding, onClear }: CartProps) {
  const t = useTranslations("pos");
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold">
          {adding ? t("addingTitle", { n: adding.n }) : t("newTitle")}
        </h2>
        <p className="truncate text-sm text-muted-foreground">
          {adding ? adding.where : t("notSent")}
        </p>
      </div>
      {draft.lines.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="-mt-1 -mr-2 text-muted-foreground hover:text-tone-red-text"
          aria-label={t("clear")}
          onClick={onClear}
        >
          <TrashIcon />
        </Button>
      )}
    </div>
  );
}
