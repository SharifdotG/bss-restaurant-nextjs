"use client";

import {
  ArrowsClockwiseIcon,
  DotsThreeIcon,
  PencilSimpleIcon,
  PowerIcon,
  PrinterIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, initials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TableOut } from "@/lib/api/schema";
import { shortCode } from "@/lib/tables";
import { cn } from "@/lib/utils";
import { TableQr } from "./table-qr";

export type TableAction = "edit" | "print" | "newCode" | "toggle" | "delete";

type TableCardProps = {
  table: TableOut;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onAction: (action: TableAction) => void;
};

/** One table: its QR code, size and area, who looks after it, and what can be done with it. */
export function TableCard({ table, selected, onSelect, onAction }: TableCardProps) {
  const t = useTranslations("tables.card");
  const staff = table.employees;

  return (
    <article
      className={cn(
        "relative flex flex-col gap-4 rounded-xl bg-card p-4 shadow-md ring-1 ring-transparent transition-[box-shadow] duration-(--duration-fast) ease-standard",
        selected && "ring-2 ring-primary",
        !table.isActive && "bg-card/70",
      )}
    >
      <div className="flex items-center justify-between">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(checked)}
          aria-label={t("select", { table: table.number })}
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-1 text-muted-foreground"
                aria-label={t("menu", { table: table.number })}
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            <DropdownMenuItem onClick={() => onAction("edit")}>
              <PencilSimpleIcon />
              {t("edit")}
            </DropdownMenuItem>
            {table.isActive && (
              <DropdownMenuItem onClick={() => onAction("print")}>
                <PrinterIcon />
                {t("print")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onAction("newCode")}>
              <ArrowsClockwiseIcon />
              {t("newCode")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("toggle")}>
              <PowerIcon />
              {table.isActive ? t("switchOff") : t("switchOn")}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onAction("delete")}>
              <TrashIcon />
              {t("delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        onClick={() => onAction("edit")}
        className="-m-1 flex items-center gap-4 rounded-lg p-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <TableQr
          token={table.qrToken}
          label={t("qrLabel", { table: table.number })}
          className={cn("size-24 shrink-0 ring-1 ring-border", !table.isActive && "opacity-40")}
        />
        <span className="min-w-0">
          <span className="block text-3xl leading-none font-bold tracking-tight">
            {table.number}
          </span>
          <span className="mt-2 block text-sm font-bold">{t("seats", { n: table.seats })}</span>
          <span className="block truncate text-sm text-muted-foreground">
            {table.isActive ? table.location || t("noArea") : t("off")}
          </span>
        </span>
      </button>

      <footer className="mt-auto flex items-center gap-2 border-t border-border pt-3 text-sm">
        {staff.length > 0 ? (
          <>
            <span className="flex -space-x-1.5">
              {staff.slice(0, 3).map((person) => (
                <Avatar key={person.id} className="size-6 ring-2 ring-card">
                  <AvatarFallback className="text-2xs">{initials(person.fullName)}</AvatarFallback>
                </Avatar>
              ))}
            </span>
            <span className="min-w-0 flex-1 truncate font-bold">
              {staff.length === 1
                ? staff[0].fullName.split(" ")[0]
                : t("staffMany", { name: staff[0].fullName.split(" ")[0], n: staff.length - 1 })}
            </span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{t("noStaff")}</span>
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {t("code", { code: shortCode(table.qrToken) })}
        </span>
      </footer>
    </article>
  );
}
