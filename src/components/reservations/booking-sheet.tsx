"use client";

import { useState } from "react";
import {
  CheckIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  PhoneIcon,
  TimerIcon,
  UserIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { IconInput } from "@/components/ui/input";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { RadioCards } from "@/components/ui/radio-cards";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { availabilityQuery, restaurantQuery } from "@/lib/api/queries";
import type { ReservationOut } from "@/lib/api/schema";
import { describeError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { businessDate, dayToDate, dhakaDateTime, toDhakaIso, toLatinDigits } from "@/lib/format";
import { lengthChoices, roundUpToStep, timeSteps } from "@/lib/reservations";
import { useFormat } from "@/lib/use-format";
import { useSaveReservation } from "@/lib/use-reservation-actions";

/** What the sheet opens with: a booking to edit, or a table and time from the grid. */
export type SheetStart = { booking?: ReservationOut; tableId?: number; at?: number };

type BookingSheetProps = {
  start: SheetStart | null;
  today: string;
  now: number;
  onClose: () => void;
  onSaved: (booking: ReservationOut) => void;
};

const SHOWN_TABLES = 4;
const PHONE = /^\+?[0-9][0-9 -]{5,18}$/;

/** New bookings and edits. Tables come from the API's availability, smallest that fits first. */
export function BookingSheet({ start, today, now, onClose, onSaved }: BookingSheetProps) {
  const t = useTranslations("reservations.sheet");
  const restaurant = useQuery(restaurantQuery).data;

  return (
    <Sheet open={start !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(480px,100vw)]">
        <SheetHeader>
          <SheetTitle>
            {start?.booking ? t("editTitle", { name: start.booking.customerName }) : t("newTitle")}
          </SheetTitle>
          <SheetDescription>{start?.booking ? t("editSub") : t("newSub")}</SheetDescription>
        </SheetHeader>
        {start && restaurant && (
          <BookingForm
            // A fresh form for every opening, so nothing carries over from the last booking.
            key={`${start.booking?.id ?? "new"}-${start.tableId ?? ""}-${start.at ?? ""}`}
            start={start}
            today={today}
            now={now}
            opensAt={restaurant.opensAt}
            closesAt={restaurant.closesAt}
            standard={restaurant.reservationMinutes}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type BookingFormProps = {
  start: SheetStart;
  today: string;
  now: number;
  opensAt: string;
  closesAt: string;
  standard: number;
  onClose: () => void;
  onSaved: (booking: ReservationOut) => void;
};

function BookingForm({
  start,
  today,
  now,
  opensAt,
  closesAt,
  standard,
  onClose,
  onSaved,
}: BookingFormProps) {
  const t = useTranslations("reservations.sheet");
  const format = useFormat();
  const errorText = useErrorText();
  const save = useSaveReservation();
  const { booking } = start;

  const firstAt =
    (booking && Date.parse(booking.startsAt)) ||
    start.at ||
    timeSteps(today, opensAt, closesAt, now)[0] ||
    roundUpToStep(now);
  const [day, setDay] = useState(() => businessDate(firstAt));
  const [at, setAt] = useState(firstAt);
  const [guests, setGuests] = useState(booking?.partySize ?? 2);
  const [minutes, setMinutes] = useState(booking?.minutes ?? standard);
  const [tableId, setTableId] = useState<number | null>(
    booking?.table?.id ?? start.tableId ?? null,
  );
  const [showAll, setShowAll] = useState(false);
  const [name, setName] = useState(booking?.customerName ?? "");
  const [phone, setPhone] = useState(booking?.customerPhone ?? "");
  const [email, setEmail] = useState(booking?.customerEmail ?? "");
  const [notes, setNotes] = useState(booking?.notes ?? "");
  const [tried, setTried] = useState(false);

  const steps = timeSteps(day, opensAt, closesAt, day === today ? now : 0);
  const times = steps.includes(at) ? steps : [at, ...steps].toSorted((a, b) => a - b);
  const startsAt = toDhakaIso(at);
  const free = useQuery(
    availabilityQuery({ startsAt, partySize: guests, minutes, reservationId: booking?.id }),
  );
  const tables = free.data?.tables ?? [];
  // A request can stay without a table until it's confirmed.
  const optional = booking?.status === "requested";
  const wanted = tables.find((table) => table.id === tableId);
  const chosen = wanted ?? (optional ? undefined : tables[0]);
  const lost = tableId !== null && free.data && !wanted;
  const shown = showAll ? tables : tables.slice(0, SHOWN_TABLES);

  const cleanPhone = toLatinDigits(phone).trim();
  const problems = {
    name: !name.trim() ? t("errors.name") : null,
    phone: !PHONE.test(cleanPhone) ? t("errors.phone") : null,
    table: !optional && !chosen ? t("errors.table") : null,
  };
  const apiFields = save.isError ? errorText.fields(save.error) : {};
  const blocked = Object.values(problems).some(Boolean);

  const pickDay = (next: string) => {
    // Same time on the new day.
    setDay(next);
    setAt(Date.parse(dhakaDateTime(next, toDhakaIso(at).slice(11, 16))));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (blocked) return;
    const body = {
      startsAt,
      minutes,
      partySize: guests,
      tableId: chosen?.id ?? null,
      customerName: name.trim(),
      customerPhone: cleanPhone,
      customerEmail: email.trim() || null,
      notes: notes.trim() || null,
    };
    save.mutate(booking ? { id: booking.id, body } : { body }, {
      onSuccess: onSaved,
      onError: (error) => {
        // Someone else took the table meanwhile: show what's free now.
        if (describeError(error).code?.startsWith("table")) void free.refetch();
      },
    });
  };

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <SheetBody className="grid content-start gap-5">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>{t("date")}</FieldLabel>
            <DatePicker
              value={day}
              onChange={pickDay}
              from={today}
              label={format.shortDate(dayToDate(day))}
              aria-label={t("date")}
            />
          </Field>
          <Field>
            <FieldLabel>{t("time")}</FieldLabel>
            <Select
              value={String(at)}
              onValueChange={(next) => next && setAt(Number(next))}
              items={times.map((step) => ({ value: String(step), label: format.time(step) }))}
            >
              <SelectTrigger aria-label={t("time")}>
                <ClockIcon className="text-muted-foreground" />
                <SelectValue className="flex-1 text-left" />
              </SelectTrigger>
              <SelectContent>
                {times.map((step) => (
                  <SelectItem key={step} value={String(step)}>
                    {format.time(step)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>{t("guests")}</FieldLabel>
            <QtyStepper
              value={guests}
              onChange={setGuests}
              min={1}
              max={50}
              label={t("guests")}
              className="w-fit"
            />
          </Field>
          <Field>
            <FieldLabel>{t("length")}</FieldLabel>
            <Select
              value={String(minutes)}
              onValueChange={(next) => next && setMinutes(Number(next))}
              items={lengthChoices(standard).map((value) => ({
                value: String(value),
                label: t("minutes", { n: value }),
              }))}
            >
              <SelectTrigger aria-label={t("length")}>
                <TimerIcon className="text-muted-foreground" />
                <SelectValue className="flex-1 text-left" />
              </SelectTrigger>
              <SelectContent>
                {lengthChoices(standard).map((value) => (
                  <SelectItem key={value} value={String(value)}>
                    {t("minutes", { n: value })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field>
          <div className="flex items-baseline justify-between gap-3">
            <FieldLabel id="booking-table">{t("table")}</FieldLabel>
            {free.data && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("fit", {
                  n: tables.length,
                  guests,
                  range: format.timeRange(free.data.startsAt, free.data.endsAt),
                })}
              </span>
            )}
          </div>
          {!free.data ? (
            <div className="grid gap-2">
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : tables.length === 0 ? (
            <p className="flex gap-2 rounded-lg bg-tone-amber-subtle px-3.5 py-3 text-sm text-tone-amber-text">
              <WarningIcon weight="duotone" className="mt-0.5 size-4 shrink-0" />
              {t("noneFree", { guests })}
            </p>
          ) : (
            <>
              <RadioCards
                aria-labelledby="booking-table"
                value={chosen ? String(chosen.id) : null}
                onValueChange={(next) => setTableId(Number(next))}
                options={shown.map((table, i) => ({
                  value: String(table.id),
                  title: (
                    <>
                      <span className="font-bold">{table.number}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        {[t("seats", { n: table.seats }), table.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </>
                  ),
                  hint:
                    table.isOccupied && day === today && at - now < 2 * 3_600_000 ? (
                      <span className="flex items-center gap-1 text-tone-amber-text">
                        <WarningIcon weight="fill" className="size-3" />
                        {t("busyNow")}
                      </span>
                    ) : i === 0 ? (
                      t("smallest")
                    ) : undefined,
                }))}
              />
              {tables.length > SHOWN_TABLES && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="justify-self-start"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? t("fewer") : t("more", { n: tables.length - SHOWN_TABLES })}
                </Button>
              )}
            </>
          )}
          {lost && <p className="text-xs text-tone-amber-text">{t("taken")}</p>}
          {tried && problems.table && <FieldError>{problems.table}</FieldError>}
        </Field>

        <div className="grid gap-4 border-t border-border pt-5">
          <Field data-invalid={Boolean((tried && problems.name) || apiFields.customerName)}>
            <FieldLabel htmlFor="booking-name">{t("name")}</FieldLabel>
            <IconInput
              id="booking-name"
              icon={UserIcon}
              value={name}
              maxLength={100}
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
            />
            {((tried && problems.name) || apiFields.customerName) && (
              <FieldError>{apiFields.customerName ?? problems.name}</FieldError>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={Boolean((tried && problems.phone) || apiFields.customerPhone)}>
              <FieldLabel htmlFor="booking-phone">{t("phone")}</FieldLabel>
              <IconInput
                id="booking-phone"
                icon={PhoneIcon}
                type="tel"
                inputMode="tel"
                value={phone}
                autoComplete="off"
                onChange={(event) => setPhone(event.target.value)}
              />
              {((tried && problems.phone) || apiFields.customerPhone) && (
                <FieldError>{apiFields.customerPhone ?? problems.phone}</FieldError>
              )}
            </Field>
            <Field data-invalid={Boolean(apiFields.customerEmail)}>
              <FieldLabel htmlFor="booking-email">{t("email")}</FieldLabel>
              <IconInput
                id="booking-email"
                icon={EnvelopeSimpleIcon}
                type="email"
                value={email}
                placeholder={t("optional")}
                autoComplete="off"
                onChange={(event) => setEmail(event.target.value)}
              />
              {apiFields.customerEmail && <FieldError>{apiFields.customerEmail}</FieldError>}
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="booking-notes">{t("notes")}</FieldLabel>
            <Textarea
              id="booking-notes"
              value={notes}
              maxLength={500}
              placeholder={t("notesPlaceholder")}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-20"
            />
          </Field>
        </div>
      </SheetBody>

      <SheetFooter className="flex-wrap items-center justify-end">
        {save.isError && Object.keys(apiFields).length === 0 && (
          <p role="alert" className="mr-auto text-sm font-medium text-tone-red-text">
            {errorText.message(save.error)}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || (tried && blocked)}>
          <CheckIcon weight="bold" />
          {save.isPending
            ? t("saving")
            : booking
              ? t("save")
              : chosen
                ? t("book", { table: chosen.number, time: format.time(at) })
                : t("bookPlain")}
        </Button>
      </SheetFooter>
    </form>
  );
}
