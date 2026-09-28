import type { UserRole as Role } from "@/lib/api/schema";
import type { LiveOrder } from "@/lib/live/types";
import { canOpen, type Page } from "@/lib/permissions";

// What the shell shows to each role. Pages come from permissions.ts, so a role never sees a
// link it can't open.

export type NavGroup = { id: "service" | "manage"; pages: Page[] };

const GROUPS: NavGroup[] = [
  { id: "service", pages: ["overview", "orders", "floor", "kitchen", "billing", "reservations"] },
  { id: "manage", pages: ["menu", "tables", "staff", "expenses", "reports", "settings"] },
];

/** Sidebar groups for a role; empty groups drop out. New order and profile live elsewhere. */
export function navGroups(role: Role): NavGroup[] {
  return GROUPS.map((group) => ({
    ...group,
    pages: group.pages.filter((page) => canOpen(role, page)),
  })).filter((group) => group.pages.length > 0);
}

// Phones get four or five tabs; everything else sits behind More.
const TABS: Record<Role, Page[]> = {
  admin: ["overview", "orders", "floor", "reservations"],
  manager: ["overview", "orders", "floor", "reservations"],
  waiter: ["floor", "orders", "newOrder", "reservations"],
  cashier: ["billing", "orders", "reservations"],
  chef: ["kitchen", "menu"],
};

export const bottomTabs = (role: Role) => TABS[role];

/** The pages behind More on a phone: what the sidebar would list, minus the tabs. */
export function morePages(role: Role): Page[] {
  const tabs = new Set(TABS[role]);
  return navGroups(role)
    .flatMap((group) => group.pages)
    .filter((page) => !tabs.has(page));
}

// The cashier's queue: served orders, plus any that are part paid. The API marks an order
// paid by itself once the balance reaches zero, so those never show up here.
export const isBillDue = (order: LiveOrder) =>
  order.status === "served" || (order.balanceDue > 0 && order.balanceDue < order.total);

/** Badges beside nav items, from the live feed. Zero means no badge. */
export function navCounts(orders: readonly LiveOrder[]): Partial<Record<Page, number>> {
  return {
    orders: orders.length,
    billing: orders.filter(isBillDue).length,
  };
}
