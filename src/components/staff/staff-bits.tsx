"use client";

import {
  ArrowRightIcon,
  DoorOpenIcon,
  DotsThreeIcon,
  KeyIcon,
  PencilSimpleIcon,
  PowerIcon,
  UserCircleGearIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pill } from "@/components/ui/pill";
import { useRouter } from "@/i18n/navigation";
import type { EmployeeOut } from "@/lib/api/schema";
import { useSession } from "@/lib/session/client";
import { accountActions, signInState, type AccountAction } from "@/lib/staff";
import { useFormat } from "@/lib/use-format";
import { useUpdateAccount } from "@/lib/use-staff-actions";
import type { StaffDialogKind } from "./staff-dialogs";

/** Their role and whether they can get in: "Waiter · last in 2 h ago", "Sign-in off", "No sign-in". */
export function SignInSummary({ person, now }: { person: EmployeeOut; now: number }) {
  const t = useTranslations("staff");
  const format = useFormat();
  const state = signInState(person);
  if (state === "none")
    return <span className="text-sm text-muted-foreground">{t("noSignIn")}</span>;
  const account = person.account!;
  return (
    <span className="grid gap-0.5">
      <span className="flex items-center gap-2">
        <span className="font-medium">{t(`roles.${account.role}.name`)}</span>
        {state === "off" && (
          <Pill tone="slate" icon={PowerIcon} className="h-5 px-2">
            {t("stateOff")}
          </Pill>
        )}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {account.lastLoginAt
          ? t("lastIn", { when: format.relative(account.lastLoginAt, now) })
          : t("neverIn")}
      </span>
    </span>
  );
}

const ACTION_ICONS = {
  account: UserPlusIcon,
  password: KeyIcon,
  role: UserCircleGearIcon,
  signInOff: PowerIcon,
  signInOn: PowerIcon,
  left: DoorOpenIcon,
} satisfies Record<AccountAction, unknown>;

type PersonMenuProps = {
  person: EmployeeOut;
  onEdit: () => void;
  onDialog: (kind: StaffDialogKind) => void;
  /** The list links each row to the person page; the page itself doesn't need it. */
  withOpen?: boolean;
};

/** The "⋯" for a person: their page, edit, and whatever their sign-in allows. */
export function PersonMenu({ person, onEdit, onDialog, withOpen }: PersonMenuProps) {
  const t = useTranslations("staff.actions");
  const router = useRouter();
  const session = useSession();
  const update = useUpdateAccount();
  if (session.status !== "authenticated") return null;

  const actions = accountActions(session.user, person);
  const sign = actions.filter((action) => action !== "left");
  if (!withOpen && !person.isActive) return null;
  const run = (action: AccountAction) =>
    action === "signInOn"
      ? update.mutate({
          userId: person.account!.id,
          name: person.fullName,
          body: { isActive: true },
        })
      : onDialog(action);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative z-10 text-muted-foreground"
            aria-label={t("menu", { name: person.fullName })}
          />
        }
      >
        <DotsThreeIcon weight="bold" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {withOpen && (
          <DropdownMenuItem onClick={() => router.push(`/staff/${person.id}`)}>
            <ArrowRightIcon />
            {t("open")}
          </DropdownMenuItem>
        )}
        {person.isActive && (
          <DropdownMenuItem onClick={onEdit}>
            <PencilSimpleIcon />
            {t("edit")}
          </DropdownMenuItem>
        )}
        {sign.length > 0 && <DropdownMenuSeparator />}
        {sign.map((action) => {
          const Icon = ACTION_ICONS[action];
          return (
            <DropdownMenuItem key={action} onClick={() => run(action)}>
              <Icon />
              {t(action)}
            </DropdownMenuItem>
          );
        })}
        {actions.includes("left") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDialog("left")}>
              <DoorOpenIcon />
              {t("left")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
