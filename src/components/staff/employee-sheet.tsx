"use client";

import { useState } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { DatePicker } from "@/components/date-picker";
import { ImageField, type ImageChange } from "@/components/image-field";
import { PasswordInput } from "@/components/password-input";
import { AffixInput } from "@/components/ui/affix-input";
import { initials } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
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
import { Textarea } from "@/components/ui/textarea";
import type { EmployeeOut, Gender, UserRole } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { amountText } from "@/lib/billing";
import { businessDate, shiftDay, toLatinDigits } from "@/lib/format";
import { parseMoney, toPaisa, toTaka } from "@/lib/money";
import { passwordProblem } from "@/lib/staff";
import { useFormat } from "@/lib/use-format";
import { useSaveEmployee } from "@/lib/use-staff-actions";
import { cn } from "@/lib/utils";
import { RoleChoice } from "./staff-dialogs";

/** null closed; an empty object to add someone. */
export type EmployeeSheetStart = { person?: EmployeeOut } | null;

type EmployeeSheetProps = {
  start: EmployeeSheetStart;
  /** Job titles already in use, offered as quick picks. */
  designations: string[];
  onClose: () => void;
  onSaved?: (person: EmployeeOut) => void;
};

export function EmployeeSheet({ start, designations, onClose, onSaved }: EmployeeSheetProps) {
  const t = useTranslations("staff.sheet");
  const person = start?.person;

  return (
    <Sheet open={start !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[min(560px,100vw)]">
        <SheetHeader>
          <SheetTitle>
            {person ? t("editTitle", { name: person.fullName }) : t("newTitle")}
          </SheetTitle>
          <SheetDescription>{person ? t("editSub") : t("newSub")}</SheetDescription>
        </SheetHeader>
        {start && (
          <EmployeeForm
            key={person?.id ?? "new"}
            person={person}
            designations={designations}
            onClose={onClose}
            onSaved={onSaved}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// Same rules as the API, so the field can say what's wrong before saving.
const PHONE = /^\+?[0-9][0-9 -]{5,18}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-3 text-2xs font-bold tracking-wide text-muted-foreground uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

type EmployeeFormProps = {
  person?: EmployeeOut;
  designations: string[];
  onClose: () => void;
  onSaved?: (person: EmployeeOut) => void;
};

function EmployeeForm({ person, designations, onClose, onSaved }: EmployeeFormProps) {
  const t = useTranslations("staff.sheet");
  const format = useFormat();
  const errorText = useErrorText();
  const save = useSaveEmployee();
  const today = businessDate();
  const [firstName, setFirstName] = useState(person?.firstName ?? "");
  const [lastName, setLastName] = useState(person?.lastName ?? "");
  const [designation, setDesignation] = useState(person?.designation ?? "");
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [joinDate, setJoinDate] = useState(person?.joinDate ?? today);
  const [salary, setSalary] = useState(
    person?.monthlySalary != null ? amountText(toPaisa(person.monthlySalary)) : "",
  );
  const [birthDate, setBirthDate] = useState(person?.dateOfBirth ?? "");
  const [gender, setGender] = useState<Gender | "">(person?.gender ?? "");
  const [nid, setNid] = useState(person?.nid ?? "");
  const [address, setAddress] = useState(person?.address ?? "");
  const [father, setFather] = useState(person?.fatherName ?? "");
  const [mother, setMother] = useState(person?.motherName ?? "");
  const [spouse, setSpouse] = useState(person?.spouseName ?? "");
  const [photo, setPhoto] = useState<ImageChange>();
  const [uploading, setUploading] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const [role, setRole] = useState<UserRole | null>("waiter");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);

  const api = save.isError ? errorText.fields(save.error) : {};
  const phoneText = toLatinDigits(phone).trim();
  const salaryPaisa = salary.trim() ? parseMoney(salary) : null;
  const problems: Record<string, string | undefined> = {
    firstName: !firstName.trim() ? t("errors.required") : api.firstName,
    lastName: !lastName.trim() ? t("errors.required") : api.lastName,
    designation: !designation.trim() ? t("errors.required") : api.designation,
    phone: phoneText && !PHONE.test(phoneText) ? t("errors.phone") : api.phone,
    email:
      email.trim() && !EMAIL.test(email.trim())
        ? t("errors.email")
        : signIn && !email.trim()
          ? t("errors.emailForSignIn")
          : api.email,
    salary: salary.trim() && salaryPaisa === null ? t("errors.salary") : api.monthlySalary,
    birthDate: birthDate && birthDate >= joinDate ? t("errors.birthDate") : api.dateOfBirth,
    nid:
      nid.trim() && (nid.trim().length < 5 || nid.trim().length > 30) ? t("errors.nid") : api.nid,
    password:
      signIn && passwordProblem(password)
        ? t(`errors.password.${passwordProblem(password)!}`)
        : api["account.password"],
  };
  const invalid = Object.values(problems).some(Boolean);
  const show = (key: string) => (tried || save.isError) && problems[key];
  const general = save.isError && Object.keys(api).length === 0;

  const text = (value: string) => value.trim() || null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (invalid) return;
    const body = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      designation: designation.trim(),
      phone: text(phoneText),
      email: text(email),
      joinDate,
      dateOfBirth: birthDate || null,
      gender: gender || null,
      nid: text(nid),
      address: text(address),
      fatherName: text(father),
      motherName: text(mother),
      spouseName: text(spouse),
      monthlySalary: salaryPaisa === null ? null : toTaka(salaryPaisa),
      ...(photo && { imageKey: photo.key }),
    };
    save.mutate(
      person
        ? { id: person.id, body }
        : { body: { ...body, account: signIn && role ? { role, password } : null } },
      {
        onSuccess: (saved) => {
          onClose();
          onSaved?.(saved);
        },
      },
    );
  };

  const field = (
    key: string,
    label: string,
    input: React.ReactNode,
    hint?: React.ReactNode,
    className?: string,
  ) => (
    <Field key={key} data-invalid={Boolean(show(key))} className={className}>
      <FieldLabel htmlFor={`person-${key}`}>{label}</FieldLabel>
      {input}
      {show(key) ? (
        <FieldError>{problems[key]}</FieldError>
      ) : (
        hint && <FieldDescription>{hint}</FieldDescription>
      )}
    </Field>
  );

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <SheetBody className="grid content-start gap-8">
        <Section title={t("basics")}>
          <ImageField
            folder="users"
            url={photo ? photo.url : person?.imageUrl}
            onChange={setPhoto}
            onUploading={setUploading}
            label={t("photo")}
            hint={t("photoHint")}
            empty={
              fullName ? (
                <span className="text-2xl font-bold text-muted-foreground">
                  {initials(fullName)}
                </span>
              ) : undefined
            }
            disabled={save.isPending}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "firstName",
              t("firstName"),
              <Input
                id="person-firstName"
                value={firstName}
                maxLength={100}
                autoComplete="off"
                onChange={(event) => setFirstName(event.target.value)}
              />,
            )}
            {field(
              "lastName",
              t("lastName"),
              <Input
                id="person-lastName"
                value={lastName}
                maxLength={100}
                autoComplete="off"
                onChange={(event) => setLastName(event.target.value)}
              />,
            )}
          </div>
          {field(
            "designation",
            t("designation"),
            <>
              <Input
                id="person-designation"
                value={designation}
                maxLength={100}
                autoComplete="off"
                placeholder={t("designationPlaceholder")}
                onChange={(event) => setDesignation(event.target.value)}
              />
              {designations.length > 0 && (
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label={t("designationPick")}
                >
                  {designations.map((name) => (
                    <Chip
                      key={name}
                      pressed={designation.trim() === name}
                      onClick={() => setDesignation(name)}
                    >
                      {name}
                    </Chip>
                  ))}
                </div>
              )}
            </>,
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "phone",
              t("phone"),
              <Input
                id="person-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                maxLength={20}
                placeholder="01712 345678"
                onChange={(event) => setPhone(event.target.value)}
              />,
            )}
            {field(
              "email",
              t("email"),
              <Input
                id="person-email"
                type="email"
                value={email}
                autoComplete="off"
                placeholder="name@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />,
              person?.account ? t("emailHint") : undefined,
            )}
          </div>
          {field(
            "joinDate",
            t("joinDate"),
            <DatePicker
              value={joinDate}
              onChange={setJoinDate}
              label={format.date(joinDate)}
              aria-label={t("joinDate")}
              className="w-full sm:w-64"
            />,
          )}
        </Section>

        <Section title={t("pay")}>
          {field(
            "salary",
            t("salary"),
            <AffixInput
              id="person-salary"
              value={salary}
              prefix={format.symbol}
              suffix={t("perMonth")}
              placeholder="18000"
              onChange={(event) => setSalary(event.target.value)}
              className="sm:max-w-64"
            />,
            t("salaryHint"),
          )}
        </Section>

        <Section title={t("personal")}>
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              "birthDate",
              t("birthDate"),
              <DatePicker
                value={birthDate}
                onChange={setBirthDate}
                label={birthDate ? format.date(birthDate) : undefined}
                placeholder={t("pickDate")}
                dropdowns
                from="1940-01-01"
                to={shiftDay(today, -1)}
                aria-label={t("birthDate")}
                className="w-full"
              />,
            )}
            <Field>
              <FieldLabel id="person-gender">{t("gender")}</FieldLabel>
              <Segmented
                aria-label={t("gender")}
                value={gender || "unset"}
                onValueChange={(next) => setGender(next === "unset" ? "" : next)}
                options={(["female", "male", "other"] as const).map((value) => ({
                  value,
                  label: t(`genders.${value}`),
                }))}
                className="w-fit"
              />
            </Field>
          </div>
          {field(
            "nid",
            t("nid"),
            <Input
              id="person-nid"
              value={nid}
              maxLength={30}
              inputMode="numeric"
              autoComplete="off"
              onChange={(event) => setNid(event.target.value)}
              className="tabular-nums sm:max-w-64"
            />,
          )}
          {field(
            "address",
            t("address"),
            <Textarea
              id="person-address"
              value={address}
              maxLength={255}
              rows={2}
              onChange={(event) => setAddress(event.target.value)}
            />,
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ["father", father, setFather],
                ["mother", mother, setMother],
                ["spouse", spouse, setSpouse],
              ] as const
            ).map(([key, value, set]) =>
              field(
                key,
                t(key),
                <Input
                  id={`person-${key}`}
                  value={value}
                  maxLength={100}
                  autoComplete="off"
                  onChange={(event) => set(event.target.value)}
                />,
              ),
            )}
          </div>
        </Section>

        {!person && (
          <Section title={t("signIn")}>
            <SwitchRow
              title={t("giveSignIn")}
              hint={t("giveSignInHint")}
              checked={signIn}
              onChange={setSignIn}
            />
            <div className={cn("grid gap-4", !signIn && "hidden")}>
              <Field>
                <FieldLabel id="person-role">{t("role")}</FieldLabel>
                <RoleChoice value={role} onChange={setRole} labelledBy="person-role" />
              </Field>
              {field(
                "password",
                t("password"),
                <PasswordInput
                  id="person-password"
                  generate
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                />,
                t("passwordHint"),
              )}
            </div>
          </Section>
        )}
      </SheetBody>

      <SheetFooter className="flex-wrap items-center justify-end">
        {general && (
          <p role="alert" className="mr-auto text-sm font-medium text-tone-red-text">
            {errorText.message(save.error)}
          </p>
        )}
        <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || uploading}>
          <CheckIcon weight="bold" />
          {save.isPending ? t("saving") : person ? t("save") : t("create")}
        </Button>
      </SheetFooter>
    </form>
  );
}
