"use client";

import { useState } from "react";
import { CheckIcon, MapPinIcon, WarningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { IconInput, Input } from "@/components/ui/input";
import { QtyStepper } from "@/components/ui/qty-stepper";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SwitchRow } from "@/components/ui/switch-row";
import { Link } from "@/i18n/navigation";
import { upcomingReservationsQuery } from "@/lib/api/queries";
import type { TableOut } from "@/lib/api/schema";
import { describeError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { businessDate } from "@/lib/format";
import { PAGE_PATHS } from "@/lib/permissions";
import { requestRange, upcomingAt } from "@/lib/reservations";
import { useFormat } from "@/lib/use-format";
import { useSaveTable } from "@/lib/use-table-actions";
import { StaffPicker } from "./staff-picker";

/** null closed; an empty object for a new table. */
export type TableSheetStart = { table?: TableOut } | null;

type TableSheetProps = {
  start: TableSheetStart;
  areas: string[];
  now: number;
  onClose: () => void;
};

export function TableSheet({ start, areas, now, onClose }: TableSheetProps) {
  const t = useTranslations("tables.sheet");

  return (
    <Sheet open={start !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(460px,100vw)]">
        <SheetHeader>
          <SheetTitle>
            {start?.table ? t("editTitle", { table: start.table.number }) : t("newTitle")}
          </SheetTitle>
          <SheetDescription>{start?.table ? t("editSub") : t("newSub")}</SheetDescription>
        </SheetHeader>
        {start && (
          <TableForm
            key={start.table?.id ?? "new"}
            table={start.table}
            areas={areas}
            now={now}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type TableFormProps = { table?: TableOut; areas: string[]; now: number; onClose: () => void };

function TableForm({ table, areas, now, onClose }: TableFormProps) {
  const t = useTranslations("tables.sheet");
  const format = useFormat();
  const errorText = useErrorText();
  const save = useSaveTable();
  const [number, setNumber] = useState(table?.number ?? "");
  const [seats, setSeats] = useState(table?.seats ?? 4);
  const [area, setArea] = useState(table?.location ?? "");
  const [active, setActive] = useState(table?.isActive ?? true);
  const [staff, setStaff] = useState(() => table?.employees.map((person) => person.id) ?? []);
  const [tried, setTried] = useState(false);

  // The API doesn't stop a table being switched off or shrunk under its bookings; this does warn.
  const today = businessDate(now);
  const upcoming = useQuery({
    ...upcomingReservationsQuery(requestRange(today), ["requested", "confirmed"]),
    enabled: Boolean(table),
  }).data;
  const affected = table
    ? upcomingAt(table.id, upcoming ?? [], now).filter(
        (booking) => !active || booking.partySize > seats,
      )
    : [];

  const apiFields = save.isError ? errorText.fields(save.error) : {};
  const taken = save.isError && describeError(save.error).code === "table_exists";
  const numberProblem = !number.trim()
    ? t("errors.number")
    : taken
      ? errorText.message(save.error)
      : apiFields.number;
  const sameStaff =
    table &&
    staff.length === table.employees.length &&
    table.employees.every((person) => staff.includes(person.id));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (!number.trim()) return;
    const body = {
      number: number.trim(),
      seats,
      location: area.trim() || null,
      isActive: active,
    };
    save.mutate(
      table
        ? { id: table.id, body, employeeIds: sameStaff ? undefined : staff }
        : { body, employeeIds: staff.length ? staff : undefined },
      { onSuccess: onClose },
    );
  };

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="grid content-start gap-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
          <Field data-invalid={Boolean((tried || taken) && numberProblem)}>
            <FieldLabel htmlFor="table-number">{t("number")}</FieldLabel>
            <Input
              id="table-number"
              value={number}
              maxLength={20}
              autoComplete="off"
              placeholder={t("numberPlaceholder")}
              onChange={(event) => setNumber(event.target.value)}
            />
            {(tried || taken) && numberProblem && <FieldError>{numberProblem}</FieldError>}
          </Field>
          <Field>
            <FieldLabel>{t("seats")}</FieldLabel>
            <QtyStepper
              value={seats}
              onChange={setSeats}
              min={1}
              max={50}
              label={t("seats")}
              className="w-fit"
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="table-area">{t("area")}</FieldLabel>
          <IconInput
            id="table-area"
            icon={MapPinIcon}
            value={area}
            maxLength={100}
            autoComplete="off"
            placeholder={t("areaPlaceholder")}
            onChange={(event) => setArea(event.target.value)}
          />
          {areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("areaPick")}>
              {areas.map((name) => (
                <Chip key={name} pressed={area.trim() === name} onClick={() => setArea(name)}>
                  {name}
                </Chip>
              ))}
            </div>
          )}
        </Field>

        <SwitchRow
          title={t("active")}
          hint={t("activeHint")}
          checked={active}
          onChange={setActive}
        />

        {affected.length > 0 && (
          <div className="grid gap-2 rounded-lg bg-tone-amber-subtle px-4 py-3 text-sm text-tone-amber-text">
            <p className="flex gap-2 font-bold">
              <WarningIcon weight="duotone" className="mt-0.5 size-4 shrink-0" />
              {t("upcoming", { table: table!.number, n: affected.length })}
            </p>
            <ul className="grid gap-1 pl-6">
              {affected.slice(0, 4).map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={{
                      pathname: PAGE_PATHS.reservations,
                      query: { day: businessDate(booking.startsAt), booking: booking.id },
                    }}
                    className="underline-offset-2 hover:underline"
                  >
                    {t("booking", {
                      when: format.dateTime(booking.startsAt),
                      name: booking.customerName,
                      n: booking.partySize,
                    })}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="pl-6 text-xs">{t("upcomingHint", { table: table!.number })}</p>
          </div>
        )}

        <Field>
          <FieldLabel id="table-staff">{t("staff")}</FieldLabel>
          <FieldDescription>{t("staffHint")}</FieldDescription>
          <StaffPicker value={staff} onChange={setStaff} aria-labelledby="table-staff" />
        </Field>
      </SheetBody>

      <SheetFooter className="flex-wrap items-center justify-end">
        {save.isError && !taken && Object.keys(apiFields).length === 0 && (
          <p role="alert" className="mr-auto text-sm font-medium text-tone-red-text">
            {errorText.message(save.error)}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          <CheckIcon weight="bold" />
          {save.isPending
            ? t("saving")
            : affected.length > 0
              ? t("saveAnyway")
              : table
                ? t("save")
                : t("create")}
        </Button>
      </SheetFooter>
    </form>
  );
}
