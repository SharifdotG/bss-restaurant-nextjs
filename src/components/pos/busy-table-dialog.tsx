"use client";

import { ArmchairIcon, PlusIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OrderOut, TableOut } from "@/lib/api/schema";
import { useFormat } from "@/lib/use-format";

type BusyTableDialogProps = {
  busy: { table: TableOut; order: OrderOut } | null;
  /** Food can't be added once it's ready, so then only a separate order is offered. */
  canAdd: boolean;
  onAddToOrder: (order: OrderOut) => void;
  onSeparate: (table: TableOut) => void;
  onClose: () => void;
};

/** A table that already has an order: usually it's the same group ordering more. */
export function BusyTableDialog({
  busy,
  canAdd,
  onAddToOrder,
  onSeparate,
  onClose,
}: BusyTableDialogProps) {
  const t = useTranslations("pos.busy");
  const status = useTranslations("status.order");
  const format = useFormat();
  const n = busy ? format.orderNo(busy.order.orderNumber) : "";

  return (
    <Dialog open={busy !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {busy && (
          <>
            <DialogHeader>
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                <ArmchairIcon weight="duotone" className="size-5" />
              </span>
              <div className="min-w-0 pt-1.5 pr-8">
                <DialogTitle>{t("title", { table: busy.table.number })}</DialogTitle>
              </div>
            </DialogHeader>
            <DialogBody>
              <DialogDescription>
                {t(canAdd ? "body" : "bodyLocked", {
                  n,
                  total: format.money(busy.order.total),
                  status: status(busy.order.status).toLowerCase(),
                })}
              </DialogDescription>
            </DialogBody>
            <DialogFooter>
              <Button
                variant={canAdd ? "outline" : "default"}
                onClick={() => onSeparate(busy.table)}
              >
                {t("separate")}
              </Button>
              {canAdd && (
                <Button onClick={() => onAddToOrder(busy.order)}>
                  <PlusIcon weight="bold" />
                  {t("addTo", { n })}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
