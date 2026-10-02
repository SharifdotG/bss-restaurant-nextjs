"use client";

import { useEffect, useState } from "react";
import { ArrowLeftIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { parseAsBoolean, parseAsInteger, useQueryState } from "nuqs";
import { toast } from "sonner";
import { useOrderWhere } from "@/components/orders/order-bits";
import { PageFrame } from "@/components/shell/page-frame";
import { ShellAside } from "@/components/shell/shell-aside";
import { StateCard } from "@/components/state-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { activeOrdersQuery, dayBookingsQuery, orderQuery, tablesQuery } from "@/lib/api/queries";
import type { OrderOut, TableOut, UserRole } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { floorTables } from "@/lib/floor";
import { businessDate } from "@/lib/format";
import { canAddItems, PAGE_PATHS } from "@/lib/permissions";
import { addToCart, EMPTY_DRAFT, quantities, setLineQuantity, type Draft } from "@/lib/pos";
import { clearDraft, saveDraft, useDraft } from "@/lib/pos-draft";
import { useSession } from "@/lib/session/client";
import { useNow } from "@/lib/use-now";
import { useAddItems, useSendOrder } from "@/lib/use-order-actions";
import { useShellLayout } from "@/lib/use-shell-layout";
import { BusyTableDialog } from "./busy-table-dialog";
import { CartFooter, CartHeader, CartLines, CartTitle, type CartProps } from "./cart-panel";
import { CategoryChips, MenuGrid, MenuSearch } from "./menu-panel";
import { PosSteps } from "./pos-steps";
import { useMenu, type Menu } from "./use-menu";
import { useFormat } from "@/lib/use-format";

export function PosPage() {
  const session = useSession();
  const [addId] = useQueryState("add", parseAsInteger);
  if (session.status !== "authenticated") return null;
  const { user } = session;
  return addId ? (
    <AddItems key={addId} orderId={addId} userId={user.id} />
  ) : (
    <NewOrder userId={user.id} role={user.role} />
  );
}

/** Live tables for the picker: what's free, what's busy, what's held for a booking. */
function useFloor() {
  const now = useNow(60_000);
  const tables = useQuery(tablesQuery).data ?? [];
  const orders = useQuery(activeOrdersQuery).data?.items ?? [];
  const bookings = useQuery(dayBookingsQuery(businessDate(now))).data ?? [];
  return floorTables(tables, orders, bookings, now);
}

function NewOrder({ userId, role }: { userId: number; role: UserRole }) {
  const t = useTranslations("pos");
  const router = useRouter();
  const errorText = useErrorText();
  const menu = useMenu();
  const floor = useFloor();
  const [draft, update] = useDraft(userId);
  const send = useSendOrder();
  const [busy, setBusy] = useState<{ table: TableOut; order: OrderOut } | null>(null);

  const pickTable = (tableId: number) => {
    const entry = floor.find((candidate) => candidate.table.id === tableId);
    if (entry?.state.kind === "order") setBusy({ table: entry.table, order: entry.state.order });
    else update({ orderType: "dine_in", tableId });
  };

  const sendOrder = () =>
    send.mutate(
      {
        orderType: draft.orderType,
        tableId: draft.orderType === "dine_in" ? draft.tableId : null,
        waiterId: draft.waiterId,
        customerName: draft.orderType === "takeaway" ? draft.customerName.trim() || null : null,
        customerPhone: draft.orderType === "takeaway" ? draft.customerPhone.trim() || null : null,
        items: draft.lines,
      },
      {
        onSuccess: ({ order }) => {
          clearDraft(userId);
          router.push(`${PAGE_PATHS.orders}/${order.id}`);
        },
      },
    );

  const clear = () => {
    const before = draft;
    clearDraft(userId);
    toast(t("cleared"), {
      action: { label: t("undo"), onClick: () => saveDraft(userId, before) },
    });
  };

  const cart: CartProps = {
    draft,
    update,
    byId: menu.byId,
    prices: menu.prices,
    adding: null,
    tables: floor,
    onPickTable: pickTable,
    canPickWaiter: role === "manager" || role === "admin",
    onClear: clear,
    onSend: sendOrder,
    sending: send.isPending,
    error: send.isError ? errorText.message(send.error) : null,
  };

  return (
    <>
      <PosLayout menu={menu} cart={cart} title={t("newTitle")} />
      <BusyTableDialog
        busy={busy}
        canAdd={busy ? canAddItems(role, busy.order) : false}
        onClose={() => setBusy(null)}
        onSeparate={(table) => {
          update({ orderType: "dine_in", tableId: table.id });
          setBusy(null);
        }}
        onAddToOrder={(order) => {
          setBusy(null);
          // Whatever is already in the cart goes along to the order.
          router.push(`${PAGE_PATHS.newOrder}?add=${order.id}&carry=true`);
        }}
      />
    </>
  );
}

function AddItems({ orderId, userId }: { orderId: number; userId: number }) {
  const t = useTranslations("pos");
  const router = useRouter();
  const errorText = useErrorText();
  const session = useSession();
  const menu = useMenu();
  const where = useOrderWhere();
  const format = useFormat();
  const query = useQuery(orderQuery(orderId));
  const add = useAddItems();
  const [carry, setCarry] = useQueryState("carry", parseAsBoolean);
  const [saved] = useDraft(userId);
  const [draft, setDraft] = useState<Draft>(() => (carry ? saved : EMPTY_DRAFT));

  // Carried lines now belong to this order, so the new-order cart starts clean.
  useEffect(() => {
    if (!carry) return;
    clearDraft(userId);
    void setCarry(null);
  }, [carry, setCarry, userId]);

  const role = session.status === "authenticated" ? session.user.role : null;
  const order = query.data;
  const back = { label: t("backToOrder"), href: `${PAGE_PATHS.orders}/${orderId}` };

  if (!order || !role) {
    return (
      <PageFrame page="newOrder" title={t("addingTitle", { n: "…" })} parent={back}>
        <Skeleton className="h-96 rounded-xl bg-card" />
      </PageFrame>
    );
  }

  const n = format.orderNo(order.orderNumber);
  if (!canAddItems(role, order)) {
    return (
      <PageFrame page="newOrder" title={t("addingTitle", { n })} parent={back}>
        <div className="grid flex-1 place-items-start pt-2 md:place-items-center md:pb-24">
          <StateCard
            icon={LockSimpleIcon}
            title={t("lockedTitle", { n })}
            actions={
              <Link href={back.href} className={buttonVariants({ variant: "secondary" })}>
                <ArrowLeftIcon />
                {t("backToOrder")}
              </Link>
            }
          >
            {t("lockedBody")}
          </StateCard>
        </div>
      </PageFrame>
    );
  }

  const place = where(order);
  const cart: CartProps = {
    draft,
    update: (change) => setDraft((current) => ({ ...current, ...change })),
    byId: menu.byId,
    prices: menu.prices,
    adding: { n, where: [place.title, place.detail].filter(Boolean).join(" · ") },
    tables: [],
    onPickTable: () => undefined,
    canPickWaiter: false,
    onClear: () => setDraft(EMPTY_DRAFT),
    onSend: () =>
      add.mutate(
        { order, items: draft.lines },
        { onSuccess: () => router.push(`${PAGE_PATHS.orders}/${order.id}`) },
      ),
    sending: add.isPending,
    error: add.isError ? errorText.message(add.error) : null,
  };

  return <PosLayout menu={menu} cart={cart} title={t("addingTitle", { n })} parent={back} />;
}

type PosLayoutProps = {
  menu: Menu;
  cart: CartProps;
  title: string;
  parent?: { label: string; href: string };
};

/** Wide screens: the menu and a cart down the right edge. Narrower ones go step by step. */
function PosLayout({ menu, cart, title, parent }: PosLayoutProps) {
  const t = useTranslations("pos");
  const nav = useTranslations("nav");
  const layout = useShellLayout();
  const counts = quantities(cart.draft.lines);
  const add = (foodId: number) => cart.update({ lines: addToCart(cart.draft.lines, foodId) });
  // A dish split over lines with different notes is changed in the cart, not on its card.
  const setterFor = (foodId: number) => {
    const indexes = cart.draft.lines.flatMap((line, i) => (line.foodId === foodId ? [i] : []));
    if (indexes.length !== 1) return undefined;
    return (quantity: number) =>
      cart.update({ lines: setLineQuantity(cart.draft.lines, indexes[0], quantity) });
  };

  if (layout === "phone" || layout === "drawer") {
    return <PosSteps menu={menu} cart={cart} counts={counts} onAdd={add} setterFor={setterFor} />;
  }

  return (
    <PageFrame
      page="newOrder"
      title={title}
      parent={parent ?? { label: nav("orders"), href: PAGE_PATHS.orders }}
      actions={<MenuSearch menu={menu} className="w-72 xl:w-80" />}
    >
      <CategoryChips menu={menu} className="-mx-1 mb-5 px-1" />
      <MenuGrid menu={menu} counts={counts} onAdd={add} setterFor={setterFor} />

      <ShellAside>
        <aside
          aria-label={t("cartLabel")}
          className="sticky top-0 flex h-dvh w-[360px] shrink-0 flex-col border-l border-border bg-card xl:w-[380px]"
        >
          <div className="grid gap-4 border-b border-border p-5 xl:p-6">
            <CartTitle {...cart} />
            <CartHeader {...cart} />
          </div>
          <CartLines {...cart} className="min-h-0 flex-1 overflow-y-auto px-5 xl:px-6" />
          <div className="border-t border-border bg-muted/60 p-5 xl:p-6">
            <CartFooter {...cart} />
          </div>
        </aside>
      </ShellAside>
    </PageFrame>
  );
}
