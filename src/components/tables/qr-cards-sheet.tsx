"use client";

import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { PrintSheet } from "@/components/print-sheet";
import type { TableOut } from "@/lib/api/schema";
import { useFormat } from "@/lib/use-format";
import { TableQr } from "./table-qr";

const PER_PAGE = 4;

type QrCardsSheetProps = { tables: TableOut[]; restaurant: string; now: number };

/**
 * QR cards four to an A4 page, with a cut line round each. The scan line is printed in both
 * languages whatever the screen is set to, since guests read either.
 */
export function QrCardsSheet({ tables, restaurant, now }: QrCardsSheetProps) {
  const t = useTranslations("tables.print");
  const format = useFormat();
  const pages = Array.from({ length: Math.ceil(tables.length / PER_PAGE) }, (_, i) =>
    tables.slice(i * PER_PAGE, (i + 1) * PER_PAGE),
  );

  return (
    <PrintSheet>
      {pages.map((page, i) => (
        <section key={i} className="flex h-[272mm] break-after-page flex-col last:break-after-auto">
          <header className="flex justify-between pb-[5mm] text-xs text-muted-foreground">
            <span>{t("header", { restaurant, n: tables.length })}</span>
            <span>{t("printed", { date: format.date(now) })}</span>
          </header>
          <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-[5mm]">
            {page.map((table) => (
              <article
                key={table.id}
                className="flex flex-col items-center rounded-xl border border-dashed border-foreground/30 px-[6mm] py-[7mm] text-center text-foreground"
              >
                <p className="flex items-center gap-2 text-sm font-bold">
                  <BrandMark className="size-7 rounded-sm [&_svg]:size-4" />
                  {restaurant}
                </p>
                <p className="mt-[3mm] text-[44pt] leading-none font-bold tracking-tight">
                  {table.number}
                </p>
                <TableQr
                  token={table.qrToken}
                  label={t("qrLabel", { table: table.number })}
                  className="mt-[4mm] size-[52mm] p-0"
                />
                <p className="mt-[5mm] text-md font-bold">{t("scanEn")}</p>
                <p className="text-md text-muted-foreground">{t("scanBn")}</p>
                <p className="mt-auto pt-[3mm] text-xs text-muted-foreground">
                  {[t("table", { table: table.number }), table.location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </article>
            ))}
          </div>
          <footer className="pt-[5mm] text-xs text-muted-foreground">{t("footer")}</footer>
        </section>
      ))}
    </PrintSheet>
  );
}
