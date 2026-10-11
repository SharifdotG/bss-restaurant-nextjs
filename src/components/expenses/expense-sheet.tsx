"use client";

import { useState } from "react";
import { CheckIcon, ReceiptIcon, TrashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { DatePicker } from "@/components/date-picker";
import { ImageField, type ImageChange } from "@/components/image-field";
import { AffixInput } from "@/components/ui/affix-input";
import { Button } from "@/components/ui/button";
import { ChoiceTiles } from "@/components/ui/choice-tiles";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { ExpenseCategory, ExpenseOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { amountText } from "@/lib/billing";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { businessDate } from "@/lib/format";
import { parseMoney, toPaisa, toTaka } from "@/lib/money";
import { useSaveExpense } from "@/lib/use-expense-actions";
import { useFormat } from "@/lib/use-format";
import { EXPENSE_ICONS } from "./expense-look";

/** null closed; a new expense can start on a category or a day. */
export type ExpenseSheetStart = {
  expense?: ExpenseOut;
  category?: ExpenseCategory | null;
} | null;

type ExpenseSheetProps = {
  start: ExpenseSheetStart;
  /** Managers only. */
  onDelete?: (expense: ExpenseOut) => void;
  onClose: () => void;
};

export function ExpenseSheet({ start, onDelete, onClose }: ExpenseSheetProps) {
  const t = useTranslations("expenses.sheet");
  const expense = start?.expense;

  return (
    <Sheet open={start !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(500px,100vw)]">
        <SheetHeader>
          <SheetTitle>{expense ? t("editTitle") : t("newTitle")}</SheetTitle>
          <SheetDescription>{expense ? t("editSub") : t("newSub")}</SheetDescription>
        </SheetHeader>
        {start && (
          <ExpenseForm
            key={expense?.id ?? "new"}
            expense={expense}
            startCategory={start.category ?? null}
            onDelete={onDelete}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type ExpenseFormProps = {
  expense?: ExpenseOut;
  startCategory: ExpenseCategory | null;
  onDelete?: (expense: ExpenseOut) => void;
  onClose: () => void;
};

function ExpenseForm({ expense, startCategory, onDelete, onClose }: ExpenseFormProps) {
  const t = useTranslations("expenses.sheet");
  const tCategory = useTranslations("expenseCategories");
  const format = useFormat();
  const errorText = useErrorText();
  const save = useSaveExpense();
  const today = businessDate();
  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(expense ? amountText(toPaisa(expense.amount)) : "");
  const [category, setCategory] = useState<ExpenseCategory | null>(
    expense?.category ?? startCategory,
  );
  const [day, setDay] = useState(expense?.expenseDate ?? today);
  const [paidTo, setPaidTo] = useState(expense?.paidTo ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [receipt, setReceipt] = useState<ImageChange>();
  const [uploading, setUploading] = useState(false);
  const [tried, setTried] = useState(false);

  const paisa = parseMoney(amount);
  const api = save.isError ? errorText.fields(save.error) : {};
  const problems: Record<string, string | undefined> = {
    title: !title.trim() ? t("errors.title") : api.title,
    amount: !paisa ? t("errors.amount") : api.amount,
    category: !category ? t("errors.category") : api.category,
  };
  const invalid = Object.values(problems).some(Boolean);
  const show = (key: string) => (tried || save.isError) && problems[key];
  const general = save.isError && Object.keys(api).length === 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (invalid || !paisa || !category) return;
    const body = {
      title: title.trim(),
      amount: toTaka(paisa),
      category,
      expenseDate: day,
      paidTo: paidTo.trim() || null,
      notes: notes.trim() || null,
      ...(receipt && { receiptKey: receipt.key }),
    };
    save.mutate(expense ? { id: expense.id, body } : { body }, { onSuccess: onClose });
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="grid content-start gap-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          <Field data-invalid={Boolean(show("title"))}>
            <FieldLabel htmlFor="expense-title">{t("title")}</FieldLabel>
            <Input
              id="expense-title"
              value={title}
              maxLength={200}
              autoComplete="off"
              placeholder={t("titlePlaceholder")}
              onChange={(event) => setTitle(event.target.value)}
            />
            {show("title") && <FieldError>{problems.title}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(show("amount"))}>
            <FieldLabel htmlFor="expense-amount">{t("amount")}</FieldLabel>
            <AffixInput
              id="expense-amount"
              value={amount}
              prefix={format.symbol}
              placeholder="2500"
              onChange={(event) => setAmount(event.target.value)}
              className="text-md font-bold"
            />
            {show("amount") && <FieldError>{problems.amount}</FieldError>}
          </Field>
        </div>

        <Field data-invalid={Boolean(show("category"))}>
          <FieldLabel id="expense-category">{t("category")}</FieldLabel>
          <ChoiceTiles
            aria-label={t("category")}
            value={category ?? ("" as ExpenseCategory)}
            onValueChange={setCategory}
            options={EXPENSE_CATEGORIES.map((value) => ({
              value,
              label: <span className="text-xs">{tCategory(value)}</span>,
              icon: EXPENSE_ICONS[value],
            }))}
            className="grid-flow-row grid-cols-4"
          />
          {show("category") && <FieldError>{problems.category}</FieldError>}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t("date")}</FieldLabel>
            <DatePicker
              value={day}
              onChange={setDay}
              to={today}
              label={day === today ? t("today") : format.date(day)}
              aria-label={t("date")}
              className="w-full"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="expense-paid-to">{t("paidTo")}</FieldLabel>
            <Input
              id="expense-paid-to"
              value={paidTo}
              maxLength={150}
              autoComplete="off"
              placeholder={t("paidToPlaceholder")}
              onChange={(event) => setPaidTo(event.target.value)}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="expense-notes">{t("notes")}</FieldLabel>
          <Textarea
            id="expense-notes"
            value={notes}
            maxLength={2000}
            rows={3}
            placeholder={t("notesPlaceholder")}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>

        <ImageField
          folder="receipts"
          crop={false}
          url={receipt ? receipt.url : expense?.receiptUrl}
          onChange={setReceipt}
          onUploading={setUploading}
          label={t("receipt")}
          hint={t("receiptHint")}
          empty={<ReceiptIcon weight="duotone" className="size-8" />}
          disabled={save.isPending}
        />
      </SheetBody>

      <SheetFooter className="flex-wrap items-center justify-end">
        {expense && onDelete && (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto text-tone-red-text hover:bg-tone-red-subtle"
            onClick={() => onDelete(expense)}
            disabled={save.isPending}
          >
            <TrashIcon />
            {t("delete")}
          </Button>
        )}
        {general && (
          <p role="alert" className="w-full text-sm font-medium text-tone-red-text">
            {errorText.message(save.error)}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || uploading}>
          <CheckIcon weight="bold" />
          {save.isPending ? t("saving") : expense ? t("save") : t("create")}
        </Button>
      </SheetFooter>
    </form>
  );
}
