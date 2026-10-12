"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import {
  ArrowCounterClockwiseIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
  CloudSlashIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/panel";
import { PageFrame } from "@/components/shell/page-frame";
import { StateCard } from "@/components/state-card";
import { AffixInput } from "@/components/ui/affix-input";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SwitchRow } from "@/components/ui/switch-row";
import { Textarea } from "@/components/ui/textarea";
import { foodsQuery, restaurantQuery } from "@/lib/api/queries";
import type { RestaurantOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { toLatinDigits } from "@/lib/format";
import { parsePercent } from "@/lib/money";
import { can } from "@/lib/permissions";
import { LENGTHS } from "@/lib/reservations";
import { useSession } from "@/lib/session/client";
import { settingsChanges, timeSteps, type SettingsDraft } from "@/lib/settings";
import { useSaveRestaurant } from "@/lib/use-account-actions";
import { useFormat } from "@/lib/use-format";
import { cn } from "@/lib/utils";
import { ReceiptPreview } from "./receipt-preview";

type Form = {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  currencySymbol: string;
  vat: string;
  service: string;
  receiptFooter: string;
  acceptsQrOrders: boolean;
  acceptsOnlineOrders: boolean;
  acceptsReservations: boolean;
  autoConfirmReservations: boolean;
  reservationMinutes: number;
  opensAt: string;
  closesAt: string;
};

const toForm = (saved: RestaurantOut): Form => ({
  name: saved.name,
  address: saved.address ?? "",
  phone: saved.phone ?? "",
  email: saved.email ?? "",
  taxId: saved.taxId ?? "",
  currency: saved.currency,
  currencySymbol: saved.currencySymbol,
  vat: String(saved.vatPercent),
  service: String(saved.serviceChargePercent),
  receiptFooter: saved.receiptFooter ?? "",
  acceptsQrOrders: saved.acceptsQrOrders,
  acceptsOnlineOrders: saved.acceptsOnlineOrders,
  acceptsReservations: saved.acceptsReservations,
  autoConfirmReservations: saved.autoConfirmReservations,
  reservationMinutes: saved.reservationMinutes,
  opensAt: saved.opensAt.slice(0, 5),
  closesAt: saved.closesAt.slice(0, 5),
});

const text = (value: string) => value.trim() || null;

function toDraft(form: Form): Partial<SettingsDraft> {
  return {
    name: form.name.trim(),
    address: text(form.address),
    phone: text(toLatinDigits(form.phone)),
    email: text(form.email),
    taxId: text(form.taxId),
    currency: form.currency.trim().toUpperCase(),
    currencySymbol: form.currencySymbol.trim(),
    vatPercent: parsePercent(form.vat) ?? 0,
    serviceChargePercent: parsePercent(form.service) ?? 0,
    receiptFooter: text(form.receiptFooter),
    acceptsQrOrders: form.acceptsQrOrders,
    acceptsOnlineOrders: form.acceptsOnlineOrders,
    acceptsReservations: form.acceptsReservations,
    autoConfirmReservations: form.autoConfirmReservations,
    reservationMinutes: form.reservationMinutes,
    opensAt: `${form.opensAt}:00`,
    closesAt: `${form.closesAt}:00`,
  };
}

const PHONE = /^\+?[0-9][0-9 -]{5,18}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const percentOk = (value: string) => {
  const parsed = parsePercent(value);
  return parsed !== null && parsed <= 100;
};

/** Everything the restaurant tells guests and puts on bills, in one form with one save. */
export function SettingsPage() {
  const t = useTranslations("settings");
  const errorText = useErrorText();
  const restaurant = useQuery(restaurantQuery);

  if (restaurant.isError && !restaurant.data) {
    return (
      <PageFrame page="settings">
        <div className="grid flex-1 place-items-start pt-2 md:place-items-center md:pb-24">
          <StateCard
            heading="h2"
            icon={CloudSlashIcon}
            title={t("failed")}
            actions={
              <Button variant="secondary" onClick={() => void restaurant.refetch()}>
                <ArrowsClockwiseIcon />
                {t("retry")}
              </Button>
            }
          >
            {errorText.message(restaurant.error)}
          </StateCard>
        </div>
      </PageFrame>
    );
  }

  if (!restaurant.data) {
    return (
      <PageFrame page="settings">
        <div aria-busy className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl bg-card" />
            ))}
          </div>
          <Skeleton className="hidden h-[28rem] rounded-xl bg-card xl:block" />
        </div>
      </PageFrame>
    );
  }

  // A fresh form whenever the saved settings change, so "Discard" and saving both reset it.
  return <SettingsForm key={restaurant.data.updatedAt} saved={restaurant.data} />;
}

function SettingsForm({ saved }: { saved: RestaurantOut }) {
  const t = useTranslations("settings");
  const format = useFormat();
  const errorText = useErrorText();
  const session = useSession();
  const save = useSaveRestaurant();
  const foods = useQuery(foodsQuery).data ?? [];
  const [form, setForm] = useState(() => toForm(saved));
  const [tried, setTried] = useState(false);

  const draft = toDraft(form);
  const changes = settingsChanges(saved, draft);
  const dirty = Object.keys(changes).length > 0;
  const editable = session.status === "authenticated" && can(session.user.role, "settings.edit");

  // Ask before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set =
    <K extends keyof Form>(key: K) =>
    (value: Form[K]) =>
      setForm((current) => ({ ...current, [key]: value }));

  const api = save.isError ? errorText.fields(save.error) : {};
  const phone = toLatinDigits(form.phone).trim();
  const problems: Record<string, string | undefined> = {
    name: !form.name.trim() ? t("errors.name") : api.name,
    phone: phone && !PHONE.test(phone) ? t("errors.phone") : api.phone,
    email: form.email.trim() && !EMAIL.test(form.email.trim()) ? t("errors.email") : api.email,
    vat: !percentOk(form.vat) ? t("errors.percent") : api.vatPercent,
    service: !percentOk(form.service) ? t("errors.percent") : api.serviceChargePercent,
    currency: !/^[A-Za-z]{3}$/.test(form.currency.trim()) ? t("errors.currency") : api.currency,
    currencySymbol: !form.currencySymbol.trim() ? t("errors.symbol") : api.currencySymbol,
  };
  const invalid = Object.values(problems).some(Boolean);
  const show = (key: string) => (tried || save.isError) && problems[key];

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    setTried(true);
    if (invalid || !dirty) return;
    save.mutate(changes);
  };

  const field = (
    key: string,
    label: string,
    input: React.ReactNode,
    hint?: React.ReactNode,
    className?: string,
  ) => (
    <Field key={key} data-invalid={Boolean(show(key))} className={className}>
      <FieldLabel htmlFor={`settings-${key}`}>{label}</FieldLabel>
      {input}
      {show(key) ? (
        <FieldError>{problems[key]}</FieldError>
      ) : (
        hint && <FieldDescription>{hint}</FieldDescription>
      )}
    </Field>
  );

  const times = timeSteps(30);
  const timeItems = (current: string) =>
    (times.includes(current) ? times : [...times, current].sort()).map((value) => ({
      value,
      label: format.clock(value),
    }));
  const timeSelect = (key: "opensAt" | "closesAt") => (
    <Select
      value={form[key]}
      onValueChange={(next) => next && set(key)(next)}
      items={timeItems(form[key])}
      disabled={!editable}
    >
      <SelectTrigger id={`settings-${key}`} className="w-full">
        <SelectValue className="flex-1 text-left" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {timeItems(form[key]).map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const span = (() => {
    const toMin = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
    const minutes = (toMin(form.closesAt) - toMin(form.opensAt) + 1440) % 1440 || 1440;
    return minutes / 60;
  })();
  const lengths = LENGTHS.includes(form.reservationMinutes)
    ? LENGTHS
    : [...LENGTHS, form.reservationMinutes].sort((a, b) => a - b);

  const look = {
    name: form.name.trim(),
    address: form.address.trim(),
    phone,
    taxId: form.taxId.trim(),
    footer: form.receiptFooter.trim(),
    symbol: form.currencySymbol.trim() || "৳",
    vatPercent: percentOk(form.vat) ? parsePercent(form.vat)! : 0,
    servicePercent: percentOk(form.service) ? parsePercent(form.service)! : 0,
  };

  return (
    <PageFrame page="settings" meta={t("meta", { when: format.relative(saved.updatedAt) })}>
      <form
        onSubmit={submit}
        noValidate
        className="grid animate-appear items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]"
      >
        <fieldset disabled={!editable} className="@container grid min-w-0 gap-6">
          <Section title={t("restaurant.title")} hint={t("restaurant.hint")}>
            <div className="grid gap-4 md:grid-cols-2">
              {field(
                "name",
                t("restaurant.name"),
                <Input
                  id="settings-name"
                  value={form.name}
                  maxLength={150}
                  onChange={(event) => set("name")(event.target.value)}
                />,
                undefined,
                "md:col-span-2",
              )}
              {field(
                "phone",
                t("restaurant.phone"),
                <Input
                  id="settings-phone"
                  type="tel"
                  value={form.phone}
                  maxLength={20}
                  onChange={(event) => set("phone")(event.target.value)}
                />,
              )}
              {field(
                "email",
                t("restaurant.email"),
                <Input
                  id="settings-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => set("email")(event.target.value)}
                />,
              )}
              {field(
                "address",
                t("restaurant.address"),
                <Textarea
                  id="settings-address"
                  value={form.address}
                  maxLength={255}
                  rows={2}
                  onChange={(event) => set("address")(event.target.value)}
                />,
                undefined,
                "md:col-span-2",
              )}
            </div>
          </Section>

          <Section title={t("hours.title")} hint={t("hours.hint")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("opensAt", t("hours.opens"), timeSelect("opensAt"))}
              {field("closesAt", t("hours.closes"), timeSelect("closesAt"))}
            </div>
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <InfoIcon weight="duotone" className="mt-0.5 size-4 shrink-0" />
              {span === 24
                ? t("hours.allDay")
                : form.closesAt < form.opensAt
                  ? t("hours.pastMidnight", { hours: format.number(span) })
                  : t("hours.span", { hours: format.number(span) })}
            </p>
          </Section>

          <Section title={t("bills.title")} hint={t("bills.hint")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {field(
                "vat",
                t("bills.vat"),
                <AffixInput
                  id="settings-vat"
                  value={form.vat}
                  suffix="%"
                  onChange={(event) => set("vat")(event.target.value)}
                />,
                t("bills.vatHint"),
              )}
              {field(
                "service",
                t("bills.service"),
                <AffixInput
                  id="settings-service"
                  value={form.service}
                  suffix="%"
                  onChange={(event) => set("service")(event.target.value)}
                />,
                t("bills.serviceHint"),
              )}
              {field(
                "taxId",
                t("bills.taxId"),
                <Input
                  id="settings-taxId"
                  value={form.taxId}
                  maxLength={50}
                  onChange={(event) => set("taxId")(event.target.value)}
                />,
                t("bills.taxIdHint"),
              )}
              <div className="grid grid-cols-2 gap-4">
                {field(
                  "currency",
                  t("bills.currency"),
                  <Input
                    id="settings-currency"
                    value={form.currency}
                    maxLength={3}
                    className="uppercase"
                    onChange={(event) => set("currency")(event.target.value)}
                  />,
                )}
                {field(
                  "currencySymbol",
                  t("bills.symbol"),
                  <Input
                    id="settings-currencySymbol"
                    value={form.currencySymbol}
                    maxLength={5}
                    onChange={(event) => set("currencySymbol")(event.target.value)}
                  />,
                )}
              </div>
            </div>
            {(changes.vatPercent !== undefined || changes.serviceChargePercent !== undefined) && (
              <p className="flex items-start gap-2 rounded-lg bg-tone-amber-subtle px-4 py-3 text-sm text-tone-amber-text">
                <InfoIcon weight="duotone" className="mt-0.5 size-4 shrink-0" />
                {t("bills.newOrdersOnly")}
              </p>
            )}
          </Section>

          <Section title={t("guests.title")} hint={t("guests.hint")}>
            <div className="grid gap-3">
              <SwitchRow
                title={t("guests.qr")}
                hint={t("guests.qrHint")}
                checked={form.acceptsQrOrders}
                onChange={set("acceptsQrOrders")}
                disabled={!editable}
              />
              <SwitchRow
                title={t("guests.online")}
                hint={t("guests.onlineHint")}
                checked={form.acceptsOnlineOrders}
                onChange={set("acceptsOnlineOrders")}
                disabled={!editable}
              />
              <SwitchRow
                title={t("guests.bookings")}
                hint={t("guests.bookingsHint")}
                checked={form.acceptsReservations}
                onChange={set("acceptsReservations")}
                disabled={!editable}
              />
              <SwitchRow
                title={t("guests.autoConfirm")}
                hint={t("guests.autoConfirmHint")}
                checked={form.autoConfirmReservations}
                onChange={set("autoConfirmReservations")}
                disabled={!editable || !form.acceptsReservations}
              />
            </div>
            {field(
              "reservationMinutes",
              t("guests.length"),
              <Select
                value={String(form.reservationMinutes)}
                onValueChange={(next) => next && set("reservationMinutes")(Number(next))}
                items={lengths.map((minutes) => ({
                  value: String(minutes),
                  label: t("guests.minutes", { n: minutes }),
                }))}
                disabled={!editable}
              >
                <SelectTrigger id="settings-reservationMinutes" className="w-full sm:w-64">
                  <SelectValue className="flex-1 text-left" />
                </SelectTrigger>
                <SelectContent>
                  {lengths.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {t("guests.minutes", { n: minutes })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>,
              t("guests.lengthHint"),
            )}
          </Section>

          <Section title={t("receipt.title")} hint={t("receipt.hint")}>
            {field(
              "receiptFooter",
              t("receipt.footer"),
              <Textarea
                id="settings-receiptFooter"
                value={form.receiptFooter}
                maxLength={500}
                rows={3}
                placeholder="Thank you, come again!"
                onChange={(event) => set("receiptFooter")(event.target.value)}
              />,
              t("receipt.footerHint"),
            )}
          </Section>

          <AnimatePresence>
            {dirty && editable && (
              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
                className="sticky bottom-24 z-20 md:bottom-4"
              >
                <div
                  role="status"
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg"
                >
                  <span className="size-2 rounded-full bg-primary" aria-hidden />
                  <p className="mr-auto text-sm font-bold">
                    {t("unsaved", { n: Object.keys(changes).length })}
                  </p>
                  {save.isError && !Object.keys(api).length && (
                    <p role="alert" className="w-full text-sm font-medium text-tone-red-text">
                      {errorText.message(save.error)}
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={save.isPending}
                    onClick={() => {
                      setForm(toForm(saved));
                      setTried(false);
                      save.reset();
                    }}
                  >
                    <ArrowCounterClockwiseIcon />
                    {t("discard")}
                  </Button>
                  <Button type="submit" disabled={save.isPending}>
                    <CheckIcon weight="bold" />
                    {save.isPending ? t("saving") : t("save")}
                  </Button>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </fieldset>

        <aside className={cn("min-w-0 xl:sticky xl:top-20")}>
          <Panel title={t("preview.title")} subtitle={t("preview.hint")}>
            <ReceiptPreview look={look} foods={foods} />
          </Panel>
        </aside>
      </form>
    </PageFrame>
  );
}

/** A group of settings: what it's for on the left, its fields in a card beside it. */
function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 @2xl:grid-cols-[13rem_minmax(0,1fr)] @2xl:gap-6">
      <header className="@2xl:pt-5">
        <h2 className="text-md font-bold">{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
      </header>
      <div className="flex min-w-0 flex-col gap-5 rounded-xl bg-card p-5 shadow-md sm:p-6">
        {children}
      </div>
    </section>
  );
}
