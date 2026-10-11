import {
  BasketIcon,
  DotsThreeCircleIcon,
  LightningIcon,
  MegaphoneIcon,
  PackageIcon,
  StorefrontIcon,
  UsersThreeIcon,
  WrenchIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { ExpenseCategory } from "@/lib/api/schema";

export const EXPENSE_ICONS: Record<ExpenseCategory, Icon> = {
  ingredients: BasketIcon,
  salary: UsersThreeIcon,
  rent: StorefrontIcon,
  utilities: LightningIcon,
  supplies: PackageIcon,
  maintenance: WrenchIcon,
  marketing: MegaphoneIcon,
  other: DotsThreeCircleIcon,
};
