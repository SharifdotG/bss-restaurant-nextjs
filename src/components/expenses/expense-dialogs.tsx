"use client";

/* eslint-disable @next/next/no-img-element -- the receipt is the API's own WebP */
import { ArrowSquareOutIcon, ReceiptIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTile,
  DialogTitle,
} from "@/components/ui/dialog";
import { imageUrl } from "@/lib/api/images";
import type { ExpenseOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { useDeleteExpense } from "@/lib/use-expense-actions";
import { useFormat } from "@/lib/use-format";

type ExpenseDialogProps = { expense: ExpenseOut; onClose: () => void };

export function DeleteExpenseDialog({ expense, onClose }: ExpenseDialogProps) {
  const t = useTranslations("expenses.delete");
  const format = useFormat();
  const errorText = useErrorText();
  const remove = useDeleteExpense();

  return (
    <Dialog open onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={TrashIcon} tone="red" />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { title: expense.title })}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            {t(expense.receiptUrl ? "bodyReceipt" : "body", {
              amount: format.money(expense.amount),
              date: format.date(expense.expenseDate),
            })}
          </DialogDescription>
          {remove.isError && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(remove.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={remove.isPending} />}>
            {t("keep")}
          </DialogClose>
          <Button
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate(expense, { onSuccess: onClose })}
          >
            <TrashIcon />
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The receipt photo, big enough to read, with a way to open it full size. */
export function ReceiptDialog({ expense, onClose }: ExpenseDialogProps) {
  const t = useTranslations("expenses.receipt");
  const format = useFormat();
  const url = imageUrl(expense.receiptUrl);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTile icon={ReceiptIcon} />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{expense.title}</DialogTitle>
            <DialogDescription className="mt-1">
              {format.money(expense.amount)} · {format.date(expense.expenseDate)}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody>
          {url && (
            <img
              src={url}
              alt={t("alt", { title: expense.title })}
              className="max-h-[60dvh] w-full rounded-lg bg-muted object-contain"
            />
          )}
        </DialogBody>
        <DialogFooter>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "outline" })}
            >
              <ArrowSquareOutIcon />
              {t("open")}
            </a>
          )}
          <DialogClose render={<Button />}>{t("close")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
