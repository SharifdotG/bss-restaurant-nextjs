"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  CloudSlashIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { allTablesQuery, waitersQuery } from "@/lib/api/queries";
import type { TableOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { groupByArea } from "@/lib/reservations";
import { areaNames, matchesTable, seatCount } from "@/lib/tables";
import { useNow } from "@/lib/use-now";
import { useSaveTable } from "@/lib/use-table-actions";
import { TableCard, type TableAction } from "./table-card";
import {
  AssignStaffDialog,
  DeleteTableDialog,
  NewCodeDialog,
  SwitchOffDialog,
} from "./table-dialogs";
import { TableSheet, type TableSheetStart } from "./table-sheet";
import { useTablesUrl } from "./use-tables-url";

type Dialog = { kind: "newCode" | "switchOff" | "delete"; table: TableOut } | { kind: "assign" };

/** Every table as a QR card, by area: edit them, hand them to staff, print their codes. */
export function TablesPage() {
  const t = useTranslations("tables");
  const errorText = useErrorText();
  const now = useNow(60_000);
  const url = useTablesUrl();
  const tables = useQuery(allTablesQuery);
  const staff = useQuery(waitersQuery).data ?? [];
  const toggle = useSaveTable();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [sheet, setSheet] = useState<TableSheetStart>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const all = tables.data ?? [];
  const areas = areaNames(all);
  const shown = all.filter(
    (table) =>
      matchesTable(table, url.search) &&
      (!url.area || table.location?.trim() === url.area) &&
      (!url.staff || table.employees.some((person) => person.id === url.staff)),
  );
  const active = shown.filter((table) => table.isActive);
  const off = shown.filter((table) => !table.isActive);
  const live = all.filter((table) => table.isActive);
  const picked = all.filter((table) => selected.has(table.id));
  const filtered = Boolean(url.search || url.area || url.staff);

  const select = (ids: number[], on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const act = (table: TableOut, action: TableAction) => {
    if (action === "edit") setSheet({ table });
    else if (action === "newCode") setDialog({ kind: "newCode", table });
    else if (action === "delete") setDialog({ kind: "delete", table });
    else if (action === "toggle") {
      if (table.isActive) setDialog({ kind: "switchOff", table });
      else toggle.mutate({ id: table.id, body: { isActive: true } });
    }
  };

  const section = (title: string, list: TableOut[], extra?: React.ReactNode) => {
    const ids = list.map((table) => table.id);
    const allPicked = ids.every((id) => selected.has(id));
    return (
      <section key={title} aria-label={title}>
        <header className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="flex items-baseline gap-2 text-md font-bold">
            {title}
            <span className="text-sm font-normal text-muted-foreground">
              {t("areaCount", { n: list.length, seats: seatCount(list) })}
            </span>
          </h2>
          <Button variant="link" size="sm" onClick={() => select(ids, !allPicked)}>
            {allPicked ? t("clear") : t("selectAll")}
          </Button>
        </header>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {list.map((table) => (
            <li key={table.id} className="grid">
              <TableCard
                table={table}
                selected={selected.has(table.id)}
                onSelect={(on) => select([table.id], on)}
                onAction={(action) => act(table, action)}
              />
            </li>
          ))}
          {extra}
        </ul>
      </section>
    );
  };

  const addTile = (
    <li className="grid">
      <button
        type="button"
        onClick={() => setSheet({})}
        className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center outline-none hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <PlusIcon weight="bold" className="size-5" />
        </span>
        <span className="text-sm font-bold">{t("add")}</span>
        <span className="text-xs text-muted-foreground">{t("addHint")}</span>
      </button>
    </li>
  );

  const groups = groupByArea(active, (table) => table);

  return (
    <PageFrame
      page="tables"
      meta={
        tables.data &&
        [
          t("meta", { n: live.length, seats: seatCount(live) }),
          all.length > live.length && t("metaOff", { n: all.length - live.length }),
        ]
          .filter(Boolean)
          .join(" · ")
      }
      actions={
        <Button onClick={() => setSheet({})}>
          <PlusIcon weight="bold" />
          {t("new")}
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <IconInput
          icon={MagnifyingGlassIcon}
          type="search"
          value={url.search}
          onChange={(event) => url.setSearch(event.target.value)}
          placeholder={t("search")}
          aria-label={t("search")}
          className="w-full sm:w-72"
        />
        {areas.length > 1 && (
          <Select
            value={url.area ?? ""}
            onValueChange={(next) => url.setArea(next || null)}
            items={[
              { value: "", label: t("allAreas") },
              ...areas.map((a) => ({ value: a, label: a })),
            ]}
          >
            <SelectTrigger className="w-auto min-w-36" aria-label={t("areaFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("allAreas")}</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {staff.length > 0 && (
          <Select
            value={url.staff ? String(url.staff) : ""}
            onValueChange={(next) => url.setStaff(next ? Number(next) : null)}
            items={[
              { value: "", label: t("allStaff") },
              ...staff.map((person) => ({ value: String(person.id), label: person.fullName })),
            ]}
          >
            <SelectTrigger className="w-auto min-w-36" aria-label={t("staffFilter")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t("allStaff")}</SelectItem>
              {staff.map((person) => (
                <SelectItem key={person.id} value={String(person.id)}>
                  {person.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {picked.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-primary-soft py-1.5 pr-1.5 pl-4 text-primary-soft-foreground sm:ml-auto sm:w-auto">
            <span className="text-sm font-bold">{t("selected", { n: picked.length })}</span>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              {t("clear")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "assign" })}>
              <UsersThreeIcon />
              {t("assignStaff")}
            </Button>
          </div>
        )}
      </div>

      {tables.isError && !tables.data ? (
        <section className="rounded-xl bg-card shadow-md">
          <EmptyState
            icon={CloudSlashIcon}
            tone="slate"
            title={t("failed")}
            action={
              <Button variant="outline" onClick={() => void tables.refetch()}>
                <ArrowsClockwiseIcon />
                {t("retry")}
              </Button>
            }
          >
            {errorText.message(tables.error)}
          </EmptyState>
        </section>
      ) : !tables.data ? (
        <div aria-busy className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-xl bg-card" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <section className="rounded-xl bg-card shadow-md">
          <EmptyState
            icon={PlusIcon}
            tone="brand"
            title={t("emptyTitle")}
            action={
              <Button onClick={() => setSheet({})}>
                <PlusIcon weight="bold" />
                {t("new")}
              </Button>
            }
          >
            {t("empty")}
          </EmptyState>
        </section>
      ) : (
        <div className="grid gap-8">
          {groups.map(({ area, items }, i) =>
            section(area || t("noArea"), items, !filtered && i === groups.length - 1 && addTile),
          )}
          {!filtered && groups.length === 0 && (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
              {addTile}
            </ul>
          )}
          {off.length > 0 && section(t("offTitle"), off)}
          {filtered && shown.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("noMatch")}</p>
          )}
        </div>
      )}

      <TableSheet start={sheet} areas={areas} now={now} onClose={() => setSheet(null)} />
      {dialog?.kind === "newCode" && (
        <NewCodeDialog table={dialog.table} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "switchOff" && (
        <SwitchOffDialog table={dialog.table} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "delete" && (
        <DeleteTableDialog
          table={dialog.table}
          onClose={() => {
            select([dialog.table.id], false);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "assign" && (
        <AssignStaffDialog
          tables={picked}
          onClose={(done) => {
            if (done) setSelected(new Set());
            setDialog(null);
          }}
        />
      )}
    </PageFrame>
  );
}
