"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  PowerIcon,
  TrashIcon,
  UsersThreeIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
import { upcomingReservationsQuery } from "@/lib/api/queries";
import type { TableOut } from "@/lib/api/schema";
import { describeError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { businessDate } from "@/lib/format";
import { requestRange, upcomingAt } from "@/lib/reservations";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import {
  useDeleteTable,
  useNewQrCode,
  useSaveTable,
  useSetTableStaff,
} from "@/lib/use-table-actions";
import { StaffPicker } from "./staff-picker";

type TableDialogProps = { table: TableOut; onClose: () => void };

/** A fresh code is the fix for a lost or copied card, and the old one dies with it. */
export function NewCodeDialog({ table, onClose }: TableDialogProps) {
  const t = useTranslations("tables.newCode");
  const renew = useNewQrCode();

  return (
    <Dialog open onOpenChange={(open) => !open && !renew.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={ArrowsClockwiseIcon} tone="amber" />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { table: table.number })}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("body", { table: table.number })}</DialogDescription>
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={renew.isPending} />}>
            {t("keep")}
          </DialogClose>
          <Button
            disabled={renew.isPending}
            onClick={() => renew.mutate(table, { onSuccess: onClose })}
          >
            <ArrowsClockwiseIcon />
            {renew.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Switching off hides a table everywhere; bookings that still point at it are named first. */
export function SwitchOffDialog({ table, onClose }: TableDialogProps) {
  const t = useTranslations("tables.switchOff");
  const format = useFormat();
  const errorText = useErrorText();
  const save = useSaveTable();
  const now = useNow(60_000);
  const upcoming = useQuery(
    upcomingReservationsQuery(requestRange(businessDate(now)), ["requested", "confirmed"]),
  ).data;
  const affected = upcomingAt(table.id, upcoming ?? [], now);

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={PowerIcon} tone="amber" />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { table: table.number })}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("body")}</DialogDescription>
          {affected.length > 0 && (
            <div className="grid gap-1.5 rounded-lg bg-tone-amber-subtle px-4 py-3 text-sm text-tone-amber-text">
              <p className="flex gap-2 font-bold">
                <WarningIcon weight="duotone" className="mt-0.5 size-4 shrink-0" />
                {t("upcoming", { n: affected.length })}
              </p>
              <ul className="grid gap-0.5 pl-6 text-xs">
                {affected.slice(0, 4).map((booking) => (
                  <li key={booking.id}>
                    {format.dateTime(booking.startsAt)} · {booking.customerName}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {save.isError && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(save.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={save.isPending} />}>
            {t("keep")}
          </DialogClose>
          <Button
            disabled={save.isPending}
            onClick={() =>
              save.mutate({ id: table.id, body: { isActive: false } }, { onSuccess: onClose })
            }
          >
            <PowerIcon />
            {t("confirm", { table: table.number })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Deleting only works for a table nothing ever happened at; otherwise it offers switching off. */
export function DeleteTableDialog({ table, onClose }: TableDialogProps) {
  const t = useTranslations("tables.delete");
  const errorText = useErrorText();
  const remove = useDeleteTable();
  const save = useSaveTable();
  const inUse = remove.isError && describeError(remove.error).code === "table_in_use";
  const busy = remove.isPending || save.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={inUse ? PowerIcon : TrashIcon} tone={inUse ? "amber" : "red"} />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>
              {inUse
                ? t("inUseTitle", { table: table.number })
                : t("title", { table: table.number })}
            </DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            {inUse ? t("inUseBody") : t("body", { table: table.number })}
          </DialogDescription>
          {remove.isError && !inUse && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(remove.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={busy} />}>
            {t("keep")}
          </DialogClose>
          {inUse ? (
            table.isActive && (
              <Button
                disabled={busy}
                onClick={() =>
                  save.mutate({ id: table.id, body: { isActive: false } }, { onSuccess: onClose })
                }
              >
                <PowerIcon />
                {t("switchOff", { table: table.number })}
              </Button>
            )
          ) : (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => remove.mutate(table, { onSuccess: onClose })}
            >
              <TrashIcon />
              {remove.isPending ? t("working") : t("confirm")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Hands a set of tables to the same people, replacing whoever had them. */
export function AssignStaffDialog({
  tables,
  onClose,
}: {
  tables: TableOut[];
  onClose: (done: boolean) => void;
}) {
  const t = useTranslations("tables.assign");
  const assign = useSetTableStaff();
  // Start from the staff every picked table already shares.
  const [staff, setStaff] = useState(() =>
    (tables[0]?.employees ?? [])
      .map((person) => person.id)
      .filter((id) => tables.every((table) => table.employees.some((person) => person.id === id))),
  );

  return (
    <Dialog open onOpenChange={(open) => !open && !assign.isPending && onClose(false)}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTile icon={UsersThreeIcon} tone="brand" />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { n: tables.length })}</DialogTitle>
            <DialogDescription className="mt-1">
              {t("body", { tables: tables.map((table) => table.number).join(", ") })}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="max-h-[50dvh] overflow-y-auto">
          <StaffPicker value={staff} onChange={setStaff} />
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={assign.isPending} />}>
            {t("cancel")}
          </DialogClose>
          <Button
            disabled={assign.isPending}
            onClick={() =>
              assign.mutate({ tables, employeeIds: staff }, { onSuccess: () => onClose(true) })
            }
          >
            <UsersThreeIcon />
            {assign.isPending ? t("working") : t("confirm", { n: tables.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
