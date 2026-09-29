"use client";

import { useState } from "react";
import {
  ArmchairIcon,
  BowlFoodIcon,
  KeyboardIcon,
  MoonIcon,
  PlusIcon,
  ReceiptIcon,
  SignOutIcon,
  SunIcon,
  TranslateIcon,
  type Icon,
} from "@phosphor-icons/react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useChangeLocale } from "@/components/preferences";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { useRouter } from "@/i18n/navigation";
import { api, unwrap } from "@/lib/api/client";
import type { UserRole } from "@/lib/api/schema";
import { businessDate, shortOrderNumber, toLatinDigits } from "@/lib/format";
import { GO_KEYS, navGroups } from "@/lib/navigation";
import { closeOverlay, openOverlay, useOverlay } from "@/lib/overlays";
import { canOpen, PAGE_PATHS, type Page } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useDebounced } from "@/lib/use-debounced";
import { useFormat } from "@/lib/use-format";
import { PAGE_ICONS } from "./page-icon";
import { useSignOut } from "./user-card";

const LIMIT = 5;

// Searching needs at least two characters; one letter matches half the menu.
const searchable = (term: string) => term.length >= 2;

function useSearch(term: string, role: UserRole) {
  const enabled = searchable(term);
  const options = { enabled, placeholderData: keepPreviousData, staleTime: 30_000 } as const;
  const query = { search: term, size: LIMIT };

  const dishes = useQuery({
    ...options,
    queryKey: ["search", "foods", term],
    queryFn: () => unwrap(api.GET("/api/v1/foods", { params: { query } })),
  });
  const orders = useQuery({
    ...options,
    queryKey: ["search", "orders", term],
    queryFn: () => unwrap(api.GET("/api/v1/orders", { params: { query } })),
  });
  // Tables only lead somewhere for people who work the floor.
  const tables = useQuery({
    ...options,
    enabled: enabled && canOpen(role, "floor"),
    queryKey: ["search", "tables", term],
    queryFn: () => unwrap(api.GET("/api/v1/tables", { params: { query } })),
  });

  return {
    dishes: enabled ? (dishes.data?.items ?? []) : [],
    orders: enabled ? (orders.data?.items ?? []) : [],
    tables: enabled ? (tables.data?.items ?? []) : [],
    loading: enabled && (dishes.isFetching || orders.isFetching || tables.isFetching),
  };
}

/** ⌘K: jump to any page this role can open, run a quick action, or find a dish, order or table. */
export function CommandPalette() {
  const t = useTranslations("shell.command");
  const overlay = useOverlay("command");
  const [value, setValue] = useState("");

  return (
    <CommandDialog
      title={t("title")}
      description={t("description")}
      open={overlay.open}
      onOpenChange={(open) => {
        overlay.onOpenChange(open);
        if (!open) setValue("");
      }}
    >
      {overlay.open && <Palette value={value} onValueChange={setValue} />}
    </CommandDialog>
  );
}

function Palette({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  const t = useTranslations("shell.command");
  const nav = useTranslations("nav");
  const status = useTranslations("status.order");
  const common = useTranslations("common");
  const format = useFormat();
  const router = useRouter();
  const session = useSession();
  const locale = useLocale();
  const changeLocale = useChangeLocale();
  const { resolvedTheme, setTheme } = useTheme();
  const { leave } = useSignOut();

  // Bangla digits work too: "২২" finds order 22.
  const term = toLatinDigits(useDebounced(value.trim(), 250));
  const role = session.status === "authenticated" ? session.user.role : "waiter";
  const results = useSearch(term, role);
  if (session.status !== "authenticated") return null;

  const typed = value.trim().toLowerCase();
  const matches = (label: string) => !typed || label.toLowerCase().includes(typed);

  const go = (href: string) => {
    closeOverlay();
    router.push(href);
  };
  const run = (action: () => void) => {
    closeOverlay();
    action();
  };

  const pages: Page[] = [...navGroups(role).flatMap((group) => group.pages), "profile"];
  const dark = resolvedTheme === "dark";
  const otherLocale = locale === "en" ? "bn" : "en";
  const actions: { id: string; label: string; icon: Icon; onSelect: () => void }[] = [
    ...(canOpen(role, "newOrder")
      ? [
          {
            id: "new-order",
            label: t("newOrder"),
            icon: PlusIcon,
            onSelect: () => go(PAGE_PATHS.newOrder),
          },
        ]
      : []),
    {
      id: "theme",
      label: dark ? t("lightTheme") : t("darkTheme"),
      icon: dark ? SunIcon : MoonIcon,
      onSelect: () => run(() => setTheme(dark ? "light" : "dark")),
    },
    {
      id: "language",
      label: t("language", { language: common(`locales.${otherLocale}`) }),
      icon: TranslateIcon,
      onSelect: () => run(() => changeLocale(otherLocale)),
    },
    {
      id: "shortcuts",
      label: t("shortcuts"),
      icon: KeyboardIcon,
      onSelect: () => openOverlay("shortcuts"),
    },
    { id: "sign-out", label: t("signOut"), icon: SignOutIcon, onSelect: () => run(leave) },
  ];

  const shownPages = pages.filter((page) => matches(nav(page)));
  const shownActions = actions.filter((action) => matches(action.label));
  const today = businessDate();
  const orderHref = canOpen(role, "orders") ? PAGE_PATHS.orders : PAGE_PATHS.kitchen;

  return (
    <Command shouldFilter={false} loop label={t("title")}>
      <CommandInput
        value={value}
        onValueChange={onValueChange}
        placeholder={t("placeholder")}
        autoFocus
      >
        <Kbd>Esc</Kbd>
      </CommandInput>
      <CommandList>
        {results.loading && <CommandLoading>{t("searching")}</CommandLoading>}
        {!results.loading && <CommandEmpty>{t("empty", { term: value.trim() })}</CommandEmpty>}

        {results.dishes.length > 0 && (
          <CommandGroup heading={t("dishes")}>
            {results.dishes.map((food) => (
              <CommandItem
                key={food.id}
                value={`food-${food.id}`}
                onSelect={() => go(PAGE_PATHS.menu)}
              >
                <BowlFoodIcon weight="duotone" />
                <span className="min-w-0 flex-1 truncate font-medium">{food.name}</span>
                <CommandShortcut>
                  {format.money(food.finalPrice)} · {food.isAvailable ? t("inStock") : t("soldOut")}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.orders.length > 0 && (
          <CommandGroup heading={t("orders")}>
            {results.orders.map((order) => (
              <CommandItem
                key={order.id}
                value={`order-${order.id}`}
                onSelect={() => go(orderHref)}
              >
                <ReceiptIcon weight="duotone" />
                <span className="min-w-0 flex-1 truncate">
                  {t("order", {
                    number: format.number(Number(shortOrderNumber(order.orderNumber))),
                  })}
                  <span className="text-muted-foreground">
                    {" · "}
                    {order.table?.number ?? order.customerName ?? t("takeaway")}
                  </span>
                </span>
                <CommandShortcut>
                  {status(order.status)}
                  {/* Numbers restart every day, so older orders say which day. */}
                  {businessDate(order.createdAt) !== today &&
                    ` · ${format.shortDate(order.createdAt)}`}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results.tables.length > 0 && (
          <CommandGroup heading={t("tables")}>
            {results.tables.map((table) => (
              <CommandItem
                key={table.id}
                value={`table-${table.id}`}
                onSelect={() => go(PAGE_PATHS.floor)}
              >
                <ArmchairIcon weight="duotone" />
                <span className="min-w-0 flex-1 truncate">
                  {table.number}
                  {table.location && (
                    <span className="text-muted-foreground"> · {table.location}</span>
                  )}
                </span>
                <CommandShortcut>
                  {table.isOccupied ? t("occupied") : t("free")} · {t("seats", { n: table.seats })}
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {shownPages.length > 0 && (
          <CommandGroup heading={t("goTo")}>
            {shownPages.map((page) => {
              const PageIcon = PAGE_ICONS[page];
              const key = GO_KEYS[page];
              return (
                <CommandItem
                  key={page}
                  value={`page-${page}`}
                  onSelect={() => go(PAGE_PATHS[page])}
                >
                  <PageIcon weight="duotone" />
                  <span className="flex-1 truncate">{nav(page)}</span>
                  {key && <CommandShortcut>G {key.toUpperCase()}</CommandShortcut>}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {shownActions.length > 0 && (
          <CommandGroup heading={t("actions")}>
            {shownActions.map((action) => (
              <CommandItem key={action.id} value={action.id} onSelect={action.onSelect}>
                <action.icon weight="duotone" />
                <span className="flex-1 truncate">{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="hidden items-center gap-4 border-t border-border bg-muted px-5 py-2.5 text-xs text-muted-foreground sm:flex">
        <span className="flex items-center gap-1.5">
          <Kbd>↑↓</Kbd> {t("move")}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> {t("open")}
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd> {t("close")}
        </span>
      </div>
    </Command>
  );
}
