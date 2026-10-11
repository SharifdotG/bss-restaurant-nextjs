"use client";

import { useState } from "react";
import {
  ArrowsClockwiseIcon,
  CloudSlashIcon,
  FunnelSimpleIcon,
  MagnifyingGlassIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/empty-state";
import { Panel } from "@/components/panel";
import { PageFrame } from "@/components/shell/page-frame";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { employeesQuery, usersQuery } from "@/lib/api/queries";
import type { EmployeeOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { accountsOnly, matchesEmployee, ROLES, tableRuns } from "@/lib/staff";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { EmployeeSheet, type EmployeeSheetStart } from "./employee-sheet";
import { PersonAvatar } from "./person-avatar";
import { PersonMenu, SignInSummary } from "./staff-bits";
import { StaffDialog, type StaffDialogState } from "./staff-dialogs";
import { STAFF_SHOWS, useStaffUrl } from "./use-staff-url";

// Phone and tables drop first, then the join date, as the table narrows.
const wide = "hidden xl:table-cell";
const medium = "hidden lg:table-cell";

/** Everyone on the books, with their sign-in as a column. Pay and personal details live on each person's page. */
export function StaffPage() {
  const t = useTranslations("staff");
  const format = useFormat();
  const errorText = useErrorText();
  const now = useNow(60_000);
  const phone = useShellLayout() === "phone";
  const url = useStaffUrl();
  const employees = useQuery(employeesQuery);
  const users = useQuery(usersQuery);
  const [sheet, setSheet] = useState<EmployeeSheetStart>(null);
  const [dialog, setDialog] = useState<StaffDialogState>(null);

  const all = employees.data ?? [];
  const current = all.filter((person) => person.isActive);
  const shown = all.filter((person) =>
    matchesEmployee(person, { search: url.search, role: url.role, show: url.show }),
  );
  const loose = employees.data && users.data ? accountsOnly(users.data, all) : [];
  const filtered = Boolean(url.search || url.role) || url.show !== "current";
  const designations = [...new Set(all.map((person) => person.designation))].sort();

  const menu = (person: EmployeeOut) => (
    <PersonMenu
      person={person}
      withOpen
      onEdit={() => setSheet({ person })}
      onDialog={(kind) => setDialog({ kind, person })}
    />
  );

  // Phones fold the sign-in into the second line: "Waiter · Sign-in off".
  const detail = (person: EmployeeOut) =>
    phone
      ? [
          person.designation,
          person.account
            ? person.account.isActive
              ? t(`roles.${person.account.role}.name`)
              : t("stateOff")
            : t("noSignIn"),
        ]
          .filter((part, index, parts) => parts.indexOf(part) === index)
          .join(" · ")
      : person.designation;

  const name = (person: EmployeeOut) => (
    <Link
      href={`/staff/${person.id}`}
      className="flex min-w-0 items-center gap-3 outline-none after:absolute after:inset-0 focus-visible:after:ring-3 focus-visible:after:ring-ring/40 focus-visible:after:ring-inset"
    >
      <PersonAvatar
        name={person.fullName}
        src={person.imageUrl}
        className={cn("size-10", !person.isActive && "opacity-60")}
      />
      <span className="min-w-0">
        <span className="block truncate font-bold">{person.fullName}</span>
        <span className="block truncate text-xs text-muted-foreground">{detail(person)}</span>
      </span>
    </Link>
  );

  let body: React.ReactNode;
  if (employees.isError && !employees.data) {
    body = (
      <EmptyState
        icon={CloudSlashIcon}
        tone="slate"
        title={t("failed")}
        action={
          <Button variant="outline" onClick={() => void employees.refetch()}>
            <ArrowsClockwiseIcon />
            {t("retry")}
          </Button>
        }
      >
        {errorText.message(employees.error)}
      </EmptyState>
    );
  } else if (!employees.data) {
    body = (
      <div aria-busy className="grid gap-2 p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  } else if (all.length === 0) {
    body = (
      <EmptyState
        icon={UsersThreeIcon}
        title={t("emptyTitle")}
        action={
          <Button onClick={() => setSheet({})}>
            <UserPlusIcon />
            {t("add")}
          </Button>
        }
      >
        {t("empty")}
      </EmptyState>
    );
  } else if (shown.length === 0) {
    body = (
      <EmptyState icon={FunnelSimpleIcon} tone="slate" title={t("noMatch")}>
        {url.show === "left" ? t("noneLeft") : null}
      </EmptyState>
    );
  } else if (phone) {
    body = (
      <ul className="divide-y divide-border">
        {shown.map((person) => (
          <li key={person.id} className="relative flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">{name(person)}</div>
            {menu(person)}
          </li>
        ))}
      </ul>
    );
  } else {
    // The seed has no phone numbers; a column of dashes says nothing.
    const phones = shown.some((person) => person.phone);
    body = (
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead>{t("columns.person")}</TableHead>
            {phones && (
              <TableHead className={cn(medium, "w-[150px]")}>{t("columns.phone")}</TableHead>
            )}
            <TableHead className="w-[200px]">{t("columns.signIn")}</TableHead>
            <TableHead className={cn(wide, "w-[160px]")}>{t("columns.tables")}</TableHead>
            <TableHead className={cn(wide, "w-[130px]")}>{t("columns.joined")}</TableHead>
            <TableHead className="w-14">
              <span className="sr-only">{t("columns.actions")}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((person) => (
            <TableRow key={person.id} className="relative">
              <TableCell>{name(person)}</TableCell>
              {phones && (
                <TableCell className={cn(medium, "text-muted-foreground tabular-nums")}>
                  {person.phone ?? "–"}
                </TableCell>
              )}
              <TableCell>
                <SignInSummary person={person} now={now} />
              </TableCell>
              <TableCell className={cn(wide, "text-muted-foreground")}>
                {person.tables.length ? (
                  <>
                    <span className="block truncate text-foreground">
                      {tableRuns(person.tables.map((table) => table.number))}
                    </span>
                    {person.tables.length > 1 && (
                      <span className="block text-xs">
                        {t("tablesCount", { n: person.tables.length })}
                      </span>
                    )}
                  </>
                ) : (
                  "–"
                )}
              </TableCell>
              <TableCell className={cn(wide, "text-muted-foreground tabular-nums")}>
                {format.date(person.joinDate)}
              </TableCell>
              <TableCell className="text-right">{menu(person)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <PageFrame
      page="staff"
      meta={
        employees.data &&
        t("meta", {
          n: current.length,
          signIn: current.filter((person) => person.account?.isActive).length,
        })
      }
      actions={
        <Button onClick={() => setSheet({})}>
          <UserPlusIcon />
          {t("add")}
        </Button>
      }
    >
      <div className="grid gap-6">
        <section className="min-w-0 overflow-hidden rounded-xl bg-card shadow-md">
          <div className="flex flex-wrap items-center gap-2.5 p-4 md:px-5">
            <div className="w-full sm:w-72">
              <IconInput
                icon={MagnifyingGlassIcon}
                type="search"
                value={url.search}
                onChange={(event) => url.setSearch(event.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="w-full"
              />
            </div>
            <Select
              value={url.role ?? ""}
              onValueChange={(next) => url.setRole(next ? (next as typeof url.role) : null)}
              items={[
                { value: "", label: t("allRoles") },
                ...ROLES.map((role) => ({ value: role, label: t(`roles.${role}.name`) })),
              ]}
            >
              <SelectTrigger className="w-auto min-w-36" aria-label={t("roleFilter")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("allRoles")}</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {t(`roles.${role}.name`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="-mx-4 [scrollbar-width:none] overflow-x-auto px-4 sm:mx-0 sm:ml-auto sm:px-0">
              <Segmented
                aria-label={t("showLabel")}
                value={url.show}
                onValueChange={url.setShow}
                options={STAFF_SHOWS.map((show) => ({ value: show, label: t(`show.${show}`) }))}
              />
            </div>
          </div>
          <div className="border-t border-border">{body}</div>
        </section>

        {!filtered && loose.length > 0 && (
          <Panel title={t("accountsOnly.title")} subtitle={t("accountsOnly.body")} flush>
            <ul className="divide-y divide-border border-t border-border">
              {loose.map((user) => (
                <li key={user.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <PersonAvatar name={user.fullName} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{user.fullName}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <span className="text-right text-sm">
                    <span className="block font-medium">{t(`roles.${user.role}.name`)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {user.lastLoginAt
                        ? t("lastIn", { when: format.relative(user.lastLoginAt, now) })
                        : t("neverIn")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <EmployeeSheet start={sheet} designations={designations} onClose={() => setSheet(null)} />
      <StaffDialog state={dialog} onClose={() => setDialog(null)} />
    </PageFrame>
  );
}
