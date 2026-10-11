"use client";

import {
  CashRegisterIcon,
  ChefHatIcon,
  ForkKnifeIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Pill } from "@/components/ui/pill";
import type { UserRole } from "@/lib/api/schema";

const ROLE_ICONS: Record<UserRole, Icon> = {
  admin: ShieldCheckIcon,
  manager: UsersThreeIcon,
  waiter: ForkKnifeIcon,
  chef: ChefHatIcon,
  cashier: CashRegisterIcon,
};

/** What someone signs in as, in a quiet slate pill. */
export function RolePill({ role, className }: { role: UserRole; className?: string }) {
  const roles = useTranslations("session.roles");
  return (
    <Pill tone="slate" icon={ROLE_ICONS[role]} className={className}>
      {roles(role)}
    </Pill>
  );
}
