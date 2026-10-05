"use client";

import { useRef, useState } from "react";
import { PrinterIcon, ReceiptIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { receiptQuery } from "@/lib/api/queries";
import type { OrderStatus } from "@/lib/api/schema";
import { useFormat } from "@/lib/use-format";

type ReceiptOrder = { id: number; orderNumber: string; status: OrderStatus };

type ReceiptDialogProps = {
  order: ReceiptOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The API's own 80 mm bill or receipt, shown as it will print. The frame is sandboxed with
 * no scripts; same origin only so we can size it and call print on it.
 */
export function ReceiptDialog({ order, open, onOpenChange }: ReceiptDialogProps) {
  const t = useTranslations("billing.receipt");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const receipt = useQuery({ ...receiptQuery(order.id, order.status), enabled: open });
  const n = format.orderNo(order.orderNumber);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader>
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <ReceiptIcon weight="duotone" className="size-5" />
          </span>
          <div className="min-w-0 pr-8">
            <DialogTitle>{t(order.status === "paid" ? "receipt" : "bill", { n })}</DialogTitle>
            <DialogDescription className="text-sm">{t("hint")}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="items-center bg-muted py-5">
          {receipt.isError ? (
            <Alert tone="red" icon={WarningCircleIcon} title={t("failed")} className="w-full" />
          ) : receipt.data ? (
            // Paper stays white in dark mode, the way it comes out of the printer.
            <iframe
              ref={frame}
              title={t("frame")}
              srcDoc={receipt.data}
              sandbox="allow-same-origin allow-modals"
              // The body, not the document: a short receipt would report the frame's own height.
              onLoad={(event) =>
                setHeight(event.currentTarget.contentDocument?.body.scrollHeight ?? null)
              }
              style={{ height: height ?? 480 }}
              className="w-[316px] shrink-0 rounded-sm bg-white shadow-md"
            />
          ) : (
            <div className="grid w-[316px] gap-3 rounded-sm bg-card p-6 shadow-md">
              <Skeleton className="mx-auto h-5 w-40" />
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} className="h-3.5" />
              ))}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{tCommon("close")}</DialogClose>
          <Button disabled={!receipt.data} onClick={() => frame.current?.contentWindow?.print()}>
            <PrinterIcon />
            {t("print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PrintButtonProps = {
  order: ReceiptOrder;
  variant?: "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
};

/** "Print bill" while the order is open, "Print receipt" once it's paid; opens the preview. */
export function PrintReceiptButton({
  order,
  variant = "outline",
  size = "default",
  className,
}: PrintButtonProps) {
  const t = useTranslations("billing.bill");
  const [open, setOpen] = useState(false);
  if (order.status === "cancelled") return null;

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <PrinterIcon />
        {t(order.status === "paid" ? "printReceipt" : "printBill")}
      </Button>
      <ReceiptDialog order={order} open={open} onOpenChange={setOpen} />
    </>
  );
}
