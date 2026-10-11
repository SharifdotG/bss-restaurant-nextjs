"use client";

import { useState } from "react";
import {
  CheckIcon,
  DoorOpenIcon,
  KeyIcon,
  PowerIcon,
  UserCircleGearIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/password-input";
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
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { RadioCards } from "@/components/ui/radio-cards";
import type { EmployeeOut, UserRole } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { useSession } from "@/lib/session/client";
import { grantableRoles, passwordProblem, tableRuns } from "@/lib/staff";
import {
  useCreateAccount,
  useMarkLeft,
  useResetPassword,
  useUpdateAccount,
} from "@/lib/use-staff-actions";

export type StaffDialogKind = "account" | "password" | "role" | "signInOff" | "left";
export type StaffDialogState = { kind: StaffDialogKind; person: EmployeeOut } | null;

/** One place that opens the right dialog for a person, for the list and the person page. */
export function StaffDialog({ state, onClose }: { state: StaffDialogState; onClose: () => void }) {
  if (!state) return null;
  const props = { person: state.person, onClose };
  switch (state.kind) {
    case "account":
      return <CreateAccountDialog {...props} />;
    case "password":
      return <ResetPasswordDialog {...props} />;
    case "role":
      return <RoleDialog {...props} />;
    case "signInOff":
      return <SignInOffDialog {...props} />;
    case "left":
      return <MarkLeftDialog {...props} />;
  }
}

type DialogProps = { person: EmployeeOut; onClose: () => void };

/** Role choices with what each one opens up; managers only see the floor roles. */
export function RoleChoice({
  value,
  onChange,
  labelledBy,
}: {
  value: UserRole | null;
  onChange: (role: UserRole) => void;
  labelledBy?: string;
}) {
  const t = useTranslations("staff.roles");
  const session = useSession();
  const actor = session.status === "authenticated" ? session.user.role : "manager";
  return (
    <RadioCards
      aria-labelledby={labelledBy}
      value={value}
      onValueChange={onChange}
      options={grantableRoles(actor).map((role) => ({
        value: role,
        title: <span className="font-bold">{t(`${role}.name`)}</span>,
        hint: t(`${role}.hint`),
      }))}
    />
  );
}

function CreateAccountDialog({ person, onClose }: DialogProps) {
  const t = useTranslations("staff.account");
  const errorText = useErrorText();
  const create = useCreateAccount();
  const [role, setRole] = useState<UserRole | null>("waiter");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const problem = passwordProblem(password);
  const fields = create.isError ? errorText.fields(create.error) : {};

  return (
    <Dialog open onOpenChange={(open) => !open && !create.isPending && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTile icon={UserPlusIcon} />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { name: person.firstName })}</DialogTitle>
            <DialogDescription className="mt-1">
              {person.email ? t("body", { email: person.email }) : t("noEmail")}
            </DialogDescription>
          </div>
        </DialogHeader>
        {person.email && (
          <form
            id="create-account"
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              setTried(true);
              if (problem || !role) return;
              create.mutate({ person, body: { role, password } }, { onSuccess: onClose });
            }}
          >
            <DialogBody className="max-h-[60dvh] gap-5">
              <Field>
                <FieldLabel id="account-role">{t("role")}</FieldLabel>
                <RoleChoice value={role} onChange={setRole} labelledBy="account-role" />
              </Field>
              <Field data-invalid={Boolean((tried && problem) || fields.password)}>
                <FieldLabel htmlFor="account-password">{t("password")}</FieldLabel>
                <PasswordInput
                  id="account-password"
                  generate
                  autoComplete="new-password"
                  value={password}
                  onChange={setPassword}
                />
                {tried && problem ? (
                  <FieldError>{t(`problems.${problem}`)}</FieldError>
                ) : (
                  fields.password && <FieldError>{fields.password}</FieldError>
                )}
              </Field>
              {create.isError && !fields.password && (
                <p role="alert" className="text-sm font-medium text-tone-red-text">
                  {errorText.message(create.error)}
                </p>
              )}
            </DialogBody>
          </form>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={create.isPending} />}>
            {person.email ? t("cancel") : t("close")}
          </DialogClose>
          {person.email && (
            <Button type="submit" form="create-account" disabled={create.isPending}>
              <UserPlusIcon />
              {create.isPending ? t("working") : t("confirm")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Sets a new password and shows it once, so it can be read out or copied to them. */
function ResetPasswordDialog({ person, onClose }: DialogProps) {
  const t = useTranslations("staff.password");
  const errorText = useErrorText();
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const problem = passwordProblem(password);
  const done = reset.isSuccess;

  return (
    <Dialog open onOpenChange={(open) => !open && !reset.isPending && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTile icon={done ? CheckIcon : KeyIcon} tone={done ? "green" : "brand"} />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>
              {done
                ? t("doneTitle", { name: person.firstName })
                : t("title", { name: person.firstName })}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {done ? t("doneBody") : t("body")}
            </DialogDescription>
          </div>
        </DialogHeader>
        <form
          id="reset-password"
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (problem || !person.account) return;
            reset.mutate({ userId: person.account.id, password });
          }}
        >
          <DialogBody>
            <Field data-invalid={Boolean(tried && problem)}>
              <FieldLabel htmlFor="new-password">{t("label")}</FieldLabel>
              <PasswordInput
                id="new-password"
                generate={!done}
                readOnly={done}
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
              />
              {tried && problem && <FieldError>{t(`problems.${problem}`)}</FieldError>}
            </Field>
            {reset.isError && (
              <p role="alert" className="text-sm font-medium text-tone-red-text">
                {errorText.message(reset.error)}
              </p>
            )}
          </DialogBody>
        </form>
        <DialogFooter>
          {done ? (
            <Button onClick={onClose}>{t("done")}</Button>
          ) : (
            <>
              <DialogClose render={<Button variant="outline" disabled={reset.isPending} />}>
                {t("cancel")}
              </DialogClose>
              <Button type="submit" form="reset-password" disabled={reset.isPending}>
                <KeyIcon />
                {reset.isPending ? t("working") : t("confirm")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleDialog({ person, onClose }: DialogProps) {
  const t = useTranslations("staff.role");
  const errorText = useErrorText();
  const update = useUpdateAccount();
  const [role, setRole] = useState<UserRole | null>(person.account?.role ?? null);
  const same = role === person.account?.role;

  return (
    <Dialog open onOpenChange={(open) => !open && !update.isPending && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTile icon={UserCircleGearIcon} />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { name: person.firstName })}</DialogTitle>
            <DialogDescription className="mt-1">{t("body")}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="max-h-[60dvh]">
          <RoleChoice value={role} onChange={setRole} />
          {update.isError && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(update.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={update.isPending} />}>
            {t("cancel")}
          </DialogClose>
          <Button
            disabled={update.isPending || same || !role || !person.account}
            onClick={() =>
              update.mutate(
                { userId: person.account!.id, name: person.fullName, body: { role } },
                { onSuccess: onClose },
              )
            }
          >
            <CheckIcon weight="bold" />
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SignInOffDialog({ person, onClose }: DialogProps) {
  const t = useTranslations("staff.signInOff");
  const errorText = useErrorText();
  const update = useUpdateAccount();

  return (
    <Dialog open onOpenChange={(open) => !open && !update.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={PowerIcon} tone="amber" />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { name: person.firstName })}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>{t("body", { name: person.firstName })}</DialogDescription>
          {update.isError && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(update.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={update.isPending} />}>
            {t("keep")}
          </DialogClose>
          <Button
            disabled={update.isPending || !person.account}
            onClick={() =>
              update.mutate(
                { userId: person.account!.id, name: person.fullName, body: { isActive: false } },
                { onSuccess: onClose },
              )
            }
          >
            <PowerIcon />
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The API can't bring someone back after this, so the dialog spells out what happens. */
function MarkLeftDialog({ person, onClose }: DialogProps) {
  const t = useTranslations("staff.left");
  const errorText = useErrorText();
  const leave = useMarkLeft();
  const tables = tableRuns(person.tables.map((table) => table.number));

  return (
    <Dialog open onOpenChange={(open) => !open && !leave.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTile icon={DoorOpenIcon} tone="red" />
          <div className="min-w-0 pt-1.5 pr-8">
            <DialogTitle>{t("title", { name: person.fullName })}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogBody>
          <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground marker:text-border">
            {person.account?.isActive && <li>{t("signIn")}</li>}
            {tables && <li>{t("tables", { tables })}</li>}
            <li>{t("history")}</li>
            <li className="font-medium text-foreground">{t("final")}</li>
          </ul>
          {leave.isError && (
            <p role="alert" className="text-sm font-medium text-tone-red-text">
              {errorText.message(leave.error)}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={leave.isPending} />}>
            {t("keep")}
          </DialogClose>
          <Button
            variant="destructive"
            disabled={leave.isPending}
            onClick={() => leave.mutate(person, { onSuccess: onClose })}
          >
            <DoorOpenIcon />
            {leave.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
