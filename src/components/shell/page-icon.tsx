import {
  ArmchairIcon,
  BowlFoodIcon,
  CalendarDotsIcon,
  CashRegisterIcon,
  ChartBarIcon,
  ChefHatIcon,
  GearSixIcon,
  MapTrifoldIcon,
  PlusIcon,
  ReceiptIcon,
  SquaresFourIcon,
  UserCircleIcon,
  UsersThreeIcon,
  WalletIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { Page } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const PAGE_ICONS: Record<Page, Icon> = {
  overview: SquaresFourIcon,
  orders: ReceiptIcon,
  newOrder: PlusIcon,
  floor: MapTrifoldIcon,
  kitchen: ChefHatIcon,
  billing: CashRegisterIcon,
  reservations: CalendarDotsIcon,
  menu: BowlFoodIcon,
  tables: ArmchairIcon,
  staff: UsersThreeIcon,
  expenses: WalletIcon,
  reports: ChartBarIcon,
  settings: GearSixIcon,
  profile: UserCircleIcon,
};

/** The 32 px icon tile beside every nav item; orange only for the page you're on. */
export function PageTile({
  page,
  active,
  className,
}: {
  page: Page;
  active?: boolean;
  className?: string;
}) {
  const Icon = PAGE_ICONS[page];
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md transition-[background-color,color,box-shadow] duration-(--duration-base) ease-standard",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "bg-tile text-tile-foreground shadow-sm",
        className,
      )}
    >
      <Icon weight="duotone" className="size-[18px]" />
    </span>
  );
}
