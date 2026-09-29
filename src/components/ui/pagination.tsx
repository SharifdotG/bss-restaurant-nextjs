"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { pageWindow } from "@/lib/pagination";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Previous, the numbered pages, next. Phones get "2 of 3" between the arrows instead. */
function Pagination({ page, pages, onPageChange, className }: PaginationProps) {
  const t = useTranslations("common.pagination");
  const format = useFormatter();
  if (pages <= 1) return null;

  return (
    <nav aria-label={t("label")} className={cn("flex items-center gap-1.5", className)}>
      <Button
        variant="outline"
        size="icon"
        aria-label={t("previous")}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <CaretLeftIcon />
      </Button>

      <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
        {t("pageOf", { page, pages })}
      </span>

      <ol className="hidden items-center gap-1 sm:flex">
        {pageWindow(page, pages).map((slot, index) =>
          slot === "gap" ? (
            <li key={`gap-${index}`} aria-hidden className="w-6 text-center text-muted-foreground">
              …
            </li>
          ) : (
            <li key={slot}>
              <Button
                variant={slot === page ? "default" : "ghost"}
                size="icon"
                className="tabular-nums"
                aria-label={t("page", { page: slot })}
                aria-current={slot === page ? "page" : undefined}
                onClick={() => onPageChange(slot)}
              >
                {format.number(slot)}
              </Button>
            </li>
          ),
        )}
      </ol>

      <Button
        variant="outline"
        size="icon"
        aria-label={t("next")}
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        <CaretRightIcon />
      </Button>
    </nav>
  );
}

export { Pagination };
