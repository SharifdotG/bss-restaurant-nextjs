"use client";

import { useTranslations } from "next-intl";
import type { FoodOut } from "@/lib/api/schema";
import { formatMoney, toPaisa, toTaka } from "@/lib/money";
import { billTotals } from "@/lib/settings";

export type ReceiptLook = {
  name: string;
  address: string;
  phone: string;
  taxId: string;
  footer: string;
  symbol: string;
  vatPercent: number;
  servicePercent: number;
};

type ReceiptPreviewProps = { look: ReceiptLook; foods: FoodOut[] };

const SAMPLE = [
  { name: "Kacchi biryani", price: 420, quantity: 2 },
  { name: "Borhani", price: 80, quantity: 2 },
];

/**
 * A dine-in bill drawn like the API's 80 mm receipt, so changes to the name, charges or
 * footer can be seen before saving. Receipts always print in English, so this does too.
 */
export function ReceiptPreview({ look, foods }: ReceiptPreviewProps) {
  const t = useTranslations("settings.preview");
  const lines =
    foods.length >= 2
      ? foods.slice(0, 2).map((food, i) => ({
          name: food.name,
          price: food.finalPrice,
          quantity: i === 0 ? 2 : 1,
        }))
      : SAMPLE;
  const food = toTaka(lines.reduce((sum, line) => sum + toPaisa(line.price) * line.quantity, 0));
  const { service, vat, total } = billTotals(food, look.servicePercent, look.vatPercent);
  const money = (taka: number) => formatMoney(taka, "en", look.symbol);
  const rate = (value: number) => `${value}%`;

  return (
    <figure className="grid gap-3">
      <div className="mx-auto w-full max-w-[19rem] rounded-sm bg-white px-5 py-6 font-mono text-[11px] leading-snug text-black shadow-md">
        <p className="text-center text-sm font-bold">{look.name || "—"}</p>
        {look.address && <p className="text-center">{look.address}</p>}
        {look.phone && <p className="text-center">Phone: {look.phone}</p>}
        {look.taxId && <p className="text-center">BIN: {look.taxId}</p>}
        <p className="my-2 text-center font-bold tracking-[0.2em]">BILL</p>
        <Row label="Order" value="261013-0042" />
        <Row label="Table" value="T4" />
        <Rule />
        {lines.map((line) => (
          <div key={line.name}>
            <p>{line.name}</p>
            <Row
              label={`  ${line.quantity} x ${money(line.price)}`}
              value={money(toTaka(toPaisa(line.price) * line.quantity))}
            />
          </div>
        ))}
        <Rule />
        <Row label="Subtotal" value={money(food)} />
        {service > 0 && (
          <Row label={`Service charge ${rate(look.servicePercent)}`} value={money(service)} />
        )}
        {vat > 0 && <Row label={`VAT ${rate(look.vatPercent)}`} value={money(vat)} />}
        <Row label="Total" value={money(total)} strong />
        <Rule />
        <p className="text-center whitespace-pre-line">{look.footer || "Thank you, come again!"}</p>
      </div>
      <figcaption className="text-center text-xs text-muted-foreground">{t("caption")}</figcaption>
    </figure>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <p className={strong ? "flex justify-between pt-1 text-xs font-bold" : "flex justify-between"}>
      <span className="whitespace-pre">{label}</span>
      <span className="pl-3 whitespace-nowrap tabular-nums">{value}</span>
    </p>
  );
}

const Rule = () => <hr className="my-2 border-t border-dashed border-black/60" />;
