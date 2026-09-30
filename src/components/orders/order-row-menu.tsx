"use client";

import { ArrowRightIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "@/i18n/navigation";
import type { OrderOut } from "@/lib/api/schema";
import { shortOrderNumber } from "@/lib/format";
import { forwardMove, STATUS_LOOK } from "@/lib/orders";
import { orderMoves } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useOrderStatus } from "@/lib/use-order-actions";

/** The "⋯" at the end of a row: open it, or take the next step without leaving the list. */
export function OrderRowMenu({ order }: { order: OrderOut }) {
  const t = useTranslations("orders");
  const router = useRouter();
  const session = useSession();
  const move = useOrderStatus();
  if (session.status !== "authenticated") return null;

  const next = forwardMove(orderMoves(session.user.role, order));
  const n = shortOrderNumber(order.orderNumber);
  const NextIcon = next ? STATUS_LOOK[next].icon : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative z-10 text-muted-foreground"
            aria-label={t("rowMenu", { n })}
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onClick={() => router.push(`/orders/${order.id}`)}>
          <ArrowRightIcon />
          {t("openOrder")}
        </DropdownMenuItem>
        {next && NextIcon && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={move.isPending}
              onClick={() => move.mutate({ order, status: next })}
            >
              <NextIcon weight="duotone" />
              {t(`moves.${next}`)}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
