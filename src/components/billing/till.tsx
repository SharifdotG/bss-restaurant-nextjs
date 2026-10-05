"use client";

import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  CreditCardIcon,
  DeviceMobileIcon,
  MoneyIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { isTyping } from "@/components/shell/use-shortcuts";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ChoiceTiles } from "@/components/ui/choice-tiles";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OrderDetailOut, PaymentMethod } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import {
  amountText,
  pressKey,
  quickCash,
  shares,
  tillChange,
  tillProblem,
  WALLET_NAMES,
  WALLETS,
  type PadKey,
  type TillInput,
  type Wallet,
} from "@/lib/billing";
import { parseMoney, toPaisa, toTaka } from "@/lib/money";
import type { useTakePayment } from "@/lib/use-billing-actions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { Keypad } from "./keypad";

const METHOD_KEYS: Record<string, PaymentMethod> = { c: "cash", k: "card", m: "mobile" };
const SPLITS = [2, 3, 4];

type Split = { shares: number[]; index: number };
type MoneyField = "amount" | "received";

export type Settled = { orderId: number; change: number };

type TillProps = {
  order: OrderDetailOut;
  /** Owned by the panel, which outlives this form when the order turns paid. */
  pay: ReturnType<typeof useTakePayment>;
  /** Wide screens get the on-screen pad and the keyboard shortcuts. */
  keypad: boolean;
  onSettled: (settled: Settled) => void;
};

/**
 * Takes one payment at a time. Several payments, each with its own method, make a split
 * bill; the API closes the order once the balance reaches zero.
 */
export function Till({ order, pay, keypad, onSettled }: TillProps) {
  const t = useTranslations("billing.till");
  const format = useFormat();
  const errorText = useErrorText();
  const due = toPaisa(order.balanceDue);

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(() => amountText(due));
  const [received, setReceived] = useState("");
  const [field, setField] = useState<MoneyField>("received");
  const [split, setSplit] = useState<Split | null>(null);
  const [wallet, setWallet] = useState<Wallet>("bkash");
  const [txid, setTxid] = useState("");
  const [slip, setSlip] = useState("");

  // Card and mobile have no cash field, so the pad types the amount.
  const target: MoneyField = method === "cash" ? field : "amount";
  const input: TillInput = {
    method,
    amount: parseMoney(amount),
    tendered: method === "cash" && received ? parseMoney(received) : null,
    reference: method === "mobile" ? txid : "",
  };
  const problem = tillProblem(input, due);
  const change = tillChange(input);
  const paying = input.amount ?? 0;

  const type = (key: PadKey) => {
    if (target === "amount") {
      setSplit(null);
      setAmount((text) => pressKey(text, key));
    } else {
      setReceived((text) => pressKey(text, key));
    }
  };

  const pickSplit = (parts: number) => {
    if (split?.shares.length === parts) {
      setSplit(null);
      setAmount(amountText(due));
      return;
    }
    const next = shares(due, parts);
    setSplit({ shares: next, index: 0 });
    setAmount(amountText(next[0]));
  };

  const take = () => {
    if (problem || pay.isPending || input.amount === null) return;
    pay.mutate(
      {
        order,
        method,
        amount: input.amount,
        tendered: input.tendered,
        reference: method === "mobile" ? txid : method === "card" ? slip : undefined,
        note: method === "mobile" ? WALLET_NAMES[wallet] : undefined,
      },
      {
        onSuccess: (updated) => {
          const given = toPaisa(updated.payments.at(-1)?.change ?? 0);
          if (updated.balanceDue <= 0) {
            onSettled({ orderId: updated.id, change: given });
            return;
          }
          const left = toPaisa(updated.balanceDue);
          toast.success(
            t("partial", {
              amount: format.money(toTaka(paying)),
              left: format.money(updated.balanceDue),
            }),
            given > 0
              ? { description: t("partialChange", { amount: format.money(toTaka(given)) }) }
              : {},
          );
          const nextIndex = split ? split.index + 1 : 0;
          const nextShare = split?.shares[nextIndex];
          setSplit(split && nextShare ? { ...split, index: nextIndex } : null);
          setAmount(amountText(nextShare && nextShare <= left ? nextShare : left));
          setReceived("");
          setTxid("");
          setSlip("");
        },
      },
    );
  };

  // Digits, method letters and Enter work from anywhere on the desk; fields type natively.
  useEffect(() => {
    if (!keypad) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || document.querySelector("[role=dialog]")) return;
      const key = event.key.toLowerCase();
      if (/^[0-9.]$/.test(key)) type(key as PadKey);
      else if (key === "backspace") type("back");
      else if (key === "enter") take();
      else if (METHOD_KEYS[key]) setMethod(METHOD_KEYS[key]);
      else return;
      event.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const moneyInput = (name: MoneyField, value: string, onChange: (text: string) => void) => (
    <Input
      id={`till-${name}`}
      value={value}
      onChange={(event) => {
        if (name === "amount") setSplit(null);
        onChange(event.target.value);
      }}
      onFocus={() => setField(name)}
      inputMode={keypad ? "none" : "decimal"}
      autoComplete="off"
      placeholder="0"
      aria-invalid={
        (name === "amount" && (problem === "tooMuch" || problem === "noAmount") && value !== "") ||
        (name === "received" && problem === "notEnoughCash") ||
        undefined
      }
      className={cn(
        "h-14 text-right text-2xl font-bold tabular-nums",
        keypad && target === name && "border-ring ring-3 ring-ring/25",
      )}
    />
  );

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        take();
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 xl:p-6">
        <ChoiceTiles<PaymentMethod>
          aria-label={t("method")}
          value={method}
          onValueChange={setMethod}
          options={[
            { value: "cash", label: t("methods.cash"), icon: MoneyIcon },
            { value: "card", label: t("methods.card"), icon: CreditCardIcon },
            { value: "mobile", label: t("methods.mobile"), icon: DeviceMobileIcon },
          ]}
        />

        <Field>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel htmlFor="till-amount">{t("amount")}</FieldLabel>
            <span className="text-sm text-muted-foreground tabular-nums">
              {split
                ? t("share", { i: split.index + 1, n: split.shares.length })
                : t("of", { amount: format.money(order.balanceDue) })}
            </span>
          </div>
          {moneyInput("amount", amount, setAmount)}
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("split")}>
            <Chip
              pressed={!split && parseMoney(amount) === due}
              onClick={() => {
                setSplit(null);
                setAmount(amountText(due));
              }}
            >
              {t("whole")}
            </Chip>
            {SPLITS.map((parts) => (
              <Chip
                key={parts}
                pressed={split?.shares.length === parts}
                onClick={() => pickSplit(parts)}
                aria-label={t("splitLabel", { n: parts })}
                disabled={due < parts * 100}
              >
                {t("splitWays", { n: parts })}
              </Chip>
            ))}
          </div>
        </Field>

        {method === "cash" && (
          <Field>
            <FieldLabel htmlFor="till-received">{t("received")}</FieldLabel>
            {moneyInput("received", received, setReceived)}
            <div className="flex flex-wrap gap-2">
              {quickCash(paying).map((cash, i) => (
                <Chip
                  key={cash}
                  pressed={parseMoney(received) === cash}
                  onClick={() => {
                    setReceived(amountText(cash));
                    setField("received");
                  }}
                  className="tabular-nums"
                >
                  {i === 0 ? t("exact") : format.money(toTaka(cash))}
                </Chip>
              ))}
            </div>
          </Field>
        )}

        {method === "card" && (
          <Field>
            <FieldLabel htmlFor="till-slip">
              {t("slip")}
              <span className="font-normal text-muted-foreground">· {t("optional")}</span>
            </FieldLabel>
            <Input
              id="till-slip"
              value={slip}
              maxLength={100}
              autoComplete="off"
              onChange={(event) => setSlip(event.target.value)}
            />
          </Field>
        )}

        {method === "mobile" && (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("wallet")}>
              {WALLETS.map((option) => (
                <Chip
                  key={option}
                  size="md"
                  pressed={wallet === option}
                  onClick={() => setWallet(option)}
                >
                  {WALLET_NAMES[option]}
                </Chip>
              ))}
            </div>
            <Field>
              <FieldLabel htmlFor="till-txid">{t("txid")}</FieldLabel>
              <Input
                id="till-txid"
                value={txid}
                maxLength={100}
                autoComplete="off"
                autoCapitalize="characters"
                onChange={(event) => setTxid(event.target.value.toUpperCase())}
                className="h-12 font-bold tracking-wide"
              />
              <p className="text-sm text-muted-foreground">{t("txidHint")}</p>
            </Field>
          </>
        )}

        {keypad && <Keypad onKey={type} />}
      </div>

      <div className="grid gap-3 border-t border-border bg-muted/60 p-5 xl:p-6">
        {method === "cash" && (
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-bold">{t("change")}</span>
            <span
              className={cn(
                "text-3xl font-bold tracking-tight tabular-nums",
                change > 0 ? "text-tone-green-text" : "text-muted-foreground",
              )}
            >
              {format.money(toTaka(change))}
            </span>
          </div>
        )}
        {pay.isError && pay.variables?.order.id === order.id && (
          <Alert tone="red" icon={WarningCircleIcon} title={t("failed")}>
            {errorText.message(pay.error)}
          </Alert>
        )}
        <Button
          type="submit"
          size="lg"
          className="h-14 text-lg"
          disabled={!!problem || pay.isPending}
        >
          <CheckCircleIcon weight="duotone" className="size-6" />
          {pay.isPending ? t("taking") : t("take", { amount: format.money(toTaka(paying)) })}
        </Button>
        {problem && problem !== "noAmount" && (
          <p role="status" className="-mt-1 text-center text-sm font-medium text-tone-amber-text">
            {t(`problems.${problem}`, { amount: format.money(order.balanceDue) })}
          </p>
        )}
      </div>
    </form>
  );
}
