"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon, DevicesIcon, KeyIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LanguageSwitch, ThemeSwitch } from "@/components/preferences";
import { Panel } from "@/components/panel";
import { PasswordInput } from "@/components/password-input";
import { PageFrame } from "@/components/shell/page-frame";
import { PersonAvatar } from "@/components/staff/person-avatar";
import { RolePill } from "@/components/staff/role-pill";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch-row";
import { Link } from "@/i18n/navigation";
import { employeesQuery, meQuery } from "@/lib/api/queries";
import type { UserOut } from "@/lib/api/schema";
import { describeError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { toLatinDigits } from "@/lib/format";
import { openOverlay } from "@/lib/overlays";
import { can } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { setMuted, useMuted } from "@/lib/sound";
import { passwordProblem } from "@/lib/staff";
import { useChangePassword, useUpdateProfile } from "@/lib/use-account-actions";
import { useFormat } from "@/lib/use-format";

const PHONE = /^\+?[0-9][0-9 -]{5,18}$/;

/** Your own details, password and how the app behaves on this device. */
export function ProfilePage() {
  const t = useTranslations("profile");
  const nav = useTranslations("nav");
  const session = useSession();
  if (session.status !== "authenticated") return null;
  const { user } = session;

  return (
    <PageFrame
      page="profile"
      title={user.fullName}
      crumb={nav("profile")}
      meta={user.email}
      leading={
        <PersonAvatar
          name={user.fullName}
          className="hidden size-16 md:flex [&_[data-slot=avatar-fallback]]:text-xl"
        />
      }
      badge={<RolePill role={user.role} />}
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          <DetailsForm key={user.id} user={user} />
          <PasswordForm />
        </div>
        <div className="grid min-w-0 gap-6">
          <AccountCard user={user} />
          <DeviceCard />
          <Panel title={t("everywhere.title")} subtitle={t("everywhere.body")}>
            <Button
              variant="outline"
              className="justify-self-start"
              onClick={() => openOverlay("signOutAll")}
            >
              <DevicesIcon />
              {t("everywhere.action")}
            </Button>
          </Panel>
        </div>
      </div>
    </PageFrame>
  );
}

function DetailsForm({ user }: { user: UserOut }) {
  const t = useTranslations("profile.details");
  const errorText = useErrorText();
  const update = useUpdateProfile();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [tried, setTried] = useState(false);

  const phoneText = toLatinDigits(phone).trim();
  const api = update.isError ? errorText.fields(update.error) : {};
  const taken = update.isError && describeError(update.error).code === "phone_taken";
  const problems: Record<string, string | undefined> = {
    firstName: !firstName.trim() ? t("required") : api.firstName,
    lastName: !lastName.trim() ? t("required") : api.lastName,
    phone:
      phoneText && !PHONE.test(phoneText)
        ? t("phoneFormat")
        : taken
          ? errorText.message(update.error)
          : api.phone,
  };
  const show = (key: string) => (tried || update.isError) && problems[key];
  const dirty =
    firstName.trim() !== user.firstName ||
    lastName.trim() !== user.lastName ||
    (phoneText || null) !== (user.phone ?? null);

  return (
    <Panel title={t("title")} subtitle={t("hint")}>
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
          if (Object.values(problems).some(Boolean) || !dirty) return;
          update.mutate({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phoneText || null,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(show("firstName"))}>
            <FieldLabel htmlFor="me-first">{t("firstName")}</FieldLabel>
            <Input
              id="me-first"
              value={firstName}
              maxLength={100}
              autoComplete="given-name"
              onChange={(event) => setFirstName(event.target.value)}
            />
            {show("firstName") && <FieldError>{problems.firstName}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(show("lastName"))}>
            <FieldLabel htmlFor="me-last">{t("lastName")}</FieldLabel>
            <Input
              id="me-last"
              value={lastName}
              maxLength={100}
              autoComplete="family-name"
              onChange={(event) => setLastName(event.target.value)}
            />
            {show("lastName") && <FieldError>{problems.lastName}</FieldError>}
          </Field>
          <Field data-invalid={Boolean(show("phone"))}>
            <FieldLabel htmlFor="me-phone">{t("phone")}</FieldLabel>
            <Input
              id="me-phone"
              type="tel"
              value={phone}
              maxLength={20}
              autoComplete="tel"
              onChange={(event) => setPhone(event.target.value)}
            />
            {show("phone") && <FieldError>{problems.phone}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor="me-email">{t("email")}</FieldLabel>
            <Input id="me-email" value={user.email} readOnly disabled />
            <FieldDescription>{t("emailHint")}</FieldDescription>
          </Field>
        </div>
        {update.isError && !taken && Object.keys(api).length === 0 && (
          <p role="alert" className="text-sm font-medium text-tone-red-text">
            {errorText.message(update.error)}
          </p>
        )}
        <Button type="submit" className="justify-self-start" disabled={!dirty || update.isPending}>
          <CheckIcon weight="bold" />
          {update.isPending ? t("saving") : t("save")}
        </Button>
      </form>
    </Panel>
  );
}

function PasswordForm() {
  const t = useTranslations("profile.password");
  const errorText = useErrorText();
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [tried, setTried] = useState(false);

  const wrong = change.isError && describeError(change.error).code === "wrong_password";
  const nextProblem = passwordProblem(next);
  const problems = {
    current: !current ? t("currentMissing") : wrong ? errorText.message(change.error) : undefined,
    next: nextProblem ? t(`problems.${nextProblem}`) : undefined,
    again: again !== next ? t("mismatch") : undefined,
  };
  const show = (key: keyof typeof problems) =>
    (tried || (key === "current" && wrong)) && problems[key];

  return (
    <Panel title={t("title")} subtitle={t("hint")}>
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          setTried(true);
          if (!current || nextProblem || again !== next) return;
          change.mutate(
            { currentPassword: current, newPassword: next },
            {
              onSuccess: () => {
                setCurrent("");
                setNext("");
                setAgain("");
                setTried(false);
              },
            },
          );
        }}
      >
        <Field data-invalid={Boolean(show("current"))} className="sm:max-w-[calc(50%-0.5rem)]">
          <FieldLabel htmlFor="me-current">{t("current")}</FieldLabel>
          <PasswordInput
            id="me-current"
            autoComplete="current-password"
            value={current}
            onChange={(value) => {
              setCurrent(value);
              if (wrong) change.reset();
            }}
          />
          {show("current") && <FieldError>{problems.current}</FieldError>}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(show("next"))}>
            <FieldLabel htmlFor="me-next">{t("next")}</FieldLabel>
            <PasswordInput
              id="me-next"
              autoComplete="new-password"
              value={next}
              onChange={setNext}
            />
            {show("next") ? (
              <FieldError>{problems.next}</FieldError>
            ) : (
              <FieldDescription>{t("rule")}</FieldDescription>
            )}
          </Field>
          <Field data-invalid={Boolean(show("again"))}>
            <FieldLabel htmlFor="me-again">{t("again")}</FieldLabel>
            <PasswordInput
              id="me-again"
              autoComplete="new-password"
              value={again}
              onChange={setAgain}
            />
            {show("again") && <FieldError>{problems.again}</FieldError>}
          </Field>
        </div>
        {change.isError && !wrong && (
          <p role="alert" className="text-sm font-medium text-tone-red-text">
            {errorText.message(change.error)}
          </p>
        )}
        <Button type="submit" className="justify-self-start" disabled={change.isPending}>
          <KeyIcon />
          {change.isPending ? t("working") : t("confirm")}
        </Button>
      </form>
    </Panel>
  );
}

function AccountCard({ user }: { user: UserOut }) {
  const t = useTranslations("profile.account");
  const roles = useTranslations("session.roles");
  const format = useFormat();
  const me = useQuery(meQuery).data;
  const managesStaff = can(user.role, "staff.manage");
  // Only managers can read the staff list, so only they get the link to their own record.
  const record = useQuery({
    ...employeesQuery,
    enabled: managesStaff,
    select: (page) => page.items.find((person) => person.account?.id === user.id),
  }).data;
  const lastIn = me?.lastLoginAt ?? user.lastLoginAt;

  return (
    <Panel title={t("title")}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted-foreground">{t("role")}</dt>
        <dd className="font-medium">{roles(user.role)}</dd>
        <dt className="text-muted-foreground">{t("email")}</dt>
        <dd className="truncate font-medium">{user.email}</dd>
        {lastIn && (
          <>
            <dt className="text-muted-foreground">{t("lastIn")}</dt>
            <dd className="font-medium">{format.dateTime(lastIn)}</dd>
          </>
        )}
        <dt className="text-muted-foreground">{t("since")}</dt>
        <dd className="font-medium">{format.date(user.createdAt)}</dd>
      </dl>
      {record && (
        <Link
          href={`/staff/${record.id}`}
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-3 justify-self-start",
          })}
        >
          {t("record")}
          <ArrowRightIcon />
        </Link>
      )}
    </Panel>
  );
}

function DeviceCard() {
  const t = useTranslations("profile.device");
  const muted = useMuted();

  return (
    <Panel title={t("title")} subtitle={t("hint")}>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <p className="text-sm font-bold">{t("theme")}</p>
          <ThemeSwitch labelled fill />
          <p className="text-xs text-muted-foreground">{t("themeHint")}</p>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-bold">{t("language")}</p>
          <LanguageSwitch fill />
        </div>
        <SwitchRow
          title={t("sound")}
          hint={t("soundHint")}
          checked={!muted}
          onChange={(on) => setMuted(!on)}
        />
      </div>
    </Panel>
  );
}
