"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  CloudSlashIcon,
  DoorOpenIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PowerIcon,
  UserPlusIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Panel } from "@/components/panel";
import { PageFrame } from "@/components/shell/page-frame";
import { StateCard } from "@/components/state-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { employeeQuery, employeesQuery, staffReportQuery } from "@/lib/api/queries";
import type { EmployeeOut } from "@/lib/api/schema";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { businessDate } from "@/lib/format";
import { canOpen, PAGE_PATHS } from "@/lib/permissions";
import { presetRange } from "@/lib/reports";
import { useSession } from "@/lib/session/client";
import { accountActions, signInState } from "@/lib/staff";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";
import { useUpdateAccount } from "@/lib/use-staff-actions";
import { cn } from "@/lib/utils";
import { EmployeeSheet } from "./employee-sheet";
import { PersonAvatar } from "./person-avatar";
import { PersonMenu } from "./staff-bits";
import { StaffDialog, type StaffDialogState } from "./staff-dialogs";

/** One person: who they are, what they're paid, the tables they serve and their sign-in. */
export function PersonPage() {
  const t = useTranslations("staff");
  const errorText = useErrorText();
  const session = useSession();
  const id = Number(useParams<{ id: string }>().id);
  const valid = Number.isInteger(id) && id > 0;
  const allowed = session.status === "authenticated" && canOpen(session.user.role, "staff");
  const query = useQuery({ ...employeeQuery(id), enabled: valid && allowed });
  if (session.status !== "authenticated") return null;
  const parent = { label: t("title"), href: PAGE_PATHS.staff };

  const missing =
    !valid || (query.isError && isApiError(query.error) && query.error.status === 404);
  if (missing) {
    return (
      <PageFrame page="staff" parent={parent}>
        <div className="grid flex-1 place-items-start pt-2 md:place-items-center md:pb-24">
          <StateCard
            heading="h2"
            icon={MagnifyingGlassIcon}
            title={t("person.missingTitle")}
            actions={
              <Link href={PAGE_PATHS.staff} className={buttonVariants({ variant: "secondary" })}>
                <ArrowLeftIcon />
                {t("person.back")}
              </Link>
            }
          >
            {t("person.missingBody")}
          </StateCard>
        </div>
      </PageFrame>
    );
  }

  if (!query.data) {
    return (
      <PageFrame page="staff" title="…" parent={parent}>
        {query.isError ? (
          <div className="grid flex-1 place-items-start pt-2 md:place-items-center md:pb-24">
            <StateCard
              heading="h2"
              icon={CloudSlashIcon}
              title={t("person.failed")}
              actions={
                <Button variant="secondary" onClick={() => void query.refetch()}>
                  <ArrowsClockwiseIcon />
                  {t("retry")}
                </Button>
              }
            >
              {errorText.message(query.error)}
            </StateCard>
          </div>
        ) : (
          <div aria-busy className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <Skeleton className="h-72 rounded-xl bg-card" />
            <Skeleton className="h-56 rounded-xl bg-card" />
          </div>
        )}
      </PageFrame>
    );
  }

  return <Person person={query.data} parent={parent} />;
}

type Row = [label: string, value: React.ReactNode];

/** Label and value pairs; empty values are left out rather than shown as dashes. */
function Facts({ rows, narrow }: { rows: Row[]; narrow?: boolean }) {
  const shown = rows.filter(([, value]) => value != null && value !== "" && value !== false);
  if (!shown.length) return null;
  return (
    <dl
      className={cn(
        "grid gap-y-3 text-sm",
        narrow
          ? "grid-cols-[auto_minmax(0,1fr)] gap-x-4"
          : "grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-x-6",
      )}
    >
      {shown.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 font-medium break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Whole years between two API dates. */
function yearsBetween(from: string, to: string) {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return ty! - fy! - (tm! < fm! || (tm === fm && td! < fd!) ? 1 : 0);
}

function Person({
  person,
  parent,
}: {
  person: EmployeeOut;
  parent: { label: string; href: string };
}) {
  const t = useTranslations("staff");
  const format = useFormat();
  const session = useSession();
  const now = useNow(60_000);
  const today = businessDate(now);
  const update = useUpdateAccount();
  const [editing, setEditing] = useState(false);
  const [dialog, setDialog] = useState<StaffDialogState>(null);
  const [salaryShown, setSalaryShown] = useState(false);
  const designations = useQuery({
    ...employeesQuery,
    select: (page) => [...new Set(page.items.map((item) => item.designation))].sort(),
  }).data;
  const month = presetRange("month", today);
  const report = useQuery(staffReportQuery(month)).data;
  const stats = report?.rows.find((row) => row.employee.id === person.id);
  if (session.status !== "authenticated") return null;

  const actions = accountActions(session.user, person);
  const account = person.account;
  const state = signInState(person);
  const years = yearsBetween(person.joinDate, today);
  const open = (kind: NonNullable<StaffDialogState>["kind"]) => setDialog({ kind, person });

  return (
    <PageFrame
      page="staff"
      title={person.fullName}
      parent={parent}
      crumb={person.fullName}
      meta={[
        person.designation,
        t("person.joined", { date: format.date(person.joinDate) }),
        years > 0 && t("person.tenure", { n: years }),
      ]
        .filter(Boolean)
        .join(" · ")}
      leading={
        <PersonAvatar
          name={person.fullName}
          src={person.imageUrl}
          className="hidden size-16 md:flex [&_[data-slot=avatar-fallback]]:text-xl"
        />
      }
      badge={
        person.isActive ? (
          <Pill tone="green" icon={CheckCircleIcon}>
            {t("show.current")}
          </Pill>
        ) : (
          <Pill tone="slate" icon={DoorOpenIcon}>
            {t("show.left")}
          </Pill>
        )
      }
      actions={
        <>
          {person.isActive && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilSimpleIcon />
              {t("actions.edit")}
            </Button>
          )}
          <PersonMenu person={person} onEdit={() => setEditing(true)} onDialog={open} />
        </>
      }
    >
      {!person.isActive && (
        <p className="mb-6 flex items-center gap-2.5 rounded-xl bg-tone-slate-subtle px-4 py-3 text-sm text-tone-slate-text">
          <DoorOpenIcon weight="duotone" className="size-5 shrink-0" />
          {t("person.leftNote")}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-6">
          {stats && (stats.orders > 0 || account?.role === "waiter") && (
            <Panel
              title={t("person.monthTitle")}
              subtitle={format.dayRange(month.from, month.to)}
              action={
                <Link
                  href={{ pathname: PAGE_PATHS.reports, query: { tab: "staff" } }}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  {t("person.report")}
                  <ArrowRightIcon />
                </Link>
              }
            >
              <dl className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
                {(
                  [
                    ["orders", format.number(stats.orders)],
                    ["sales", format.moneyWhole(stats.sales)],
                    ["average", format.moneyWhole(stats.averageOrder)],
                    ["share", format.percent(stats.share)],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className="rounded-lg bg-muted px-4 py-3">
                    <dt className="text-xs text-muted-foreground">{t(`person.stats.${key}`)}</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}

          <Panel title={t("person.work")}>
            <Facts
              rows={[
                [t("sheet.designation"), person.designation],
                [t("sheet.joinDate"), format.date(person.joinDate)],
                [
                  t("sheet.phone"),
                  person.phone && <span className="tabular-nums">{person.phone}</span>,
                ],
                [t("sheet.email"), person.email],
                [
                  t("sheet.salary"),
                  person.monthlySalary != null && (
                    <button
                      type="button"
                      onClick={() => setSalaryShown((shown) => !shown)}
                      aria-pressed={salaryShown}
                      className="inline-flex items-center gap-2 rounded-sm tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                    >
                      {salaryShown ? (
                        <>
                          {t("person.salary", { amount: format.money(person.monthlySalary) })}
                          <EyeSlashIcon className="size-4 text-muted-foreground" />
                        </>
                      ) : (
                        <>
                          <span aria-hidden className="tracking-widest text-muted-foreground">
                            ••••••
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                            <EyeIcon className="size-4" />
                            {t("person.showSalary")}
                          </span>
                        </>
                      )}
                    </button>
                  ),
                ],
              ]}
            />
          </Panel>

          <Panel title={t("person.personal")} subtitle={t("person.personalHint")}>
            <Facts
              rows={[
                [
                  t("sheet.birthDate"),
                  person.dateOfBirth &&
                    t("person.birth", {
                      date: format.date(person.dateOfBirth),
                      age: yearsBetween(person.dateOfBirth, today),
                    }),
                ],
                [t("sheet.gender"), person.gender && t(`sheet.genders.${person.gender}`)],
                [t("sheet.nid"), person.nid && <span className="tabular-nums">{person.nid}</span>],
                [t("sheet.address"), person.address],
                [t("sheet.father"), person.fatherName],
                [t("sheet.mother"), person.motherName],
                [t("sheet.spouse"), person.spouseName],
              ]}
            />
            {!person.dateOfBirth && !person.nid && !person.address && !person.fatherName && (
              <p className="text-sm text-muted-foreground">{t("person.noPersonal")}</p>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 gap-6">
          <Panel title={t("person.signInTitle")}>
            {account ? (
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-md font-bold">{t(`roles.${account.role}.name`)}</span>
                  {state === "on" ? (
                    <Pill tone="green">{t("stateOn")}</Pill>
                  ) : (
                    <Pill tone="slate" icon={PowerIcon}>
                      {t("stateOff")}
                    </Pill>
                  )}
                </div>
                <Facts
                  narrow
                  rows={[
                    [t("person.signInEmail"), account.email],
                    [
                      t("person.lastIn"),
                      account.lastLoginAt
                        ? format.relative(account.lastLoginAt, now)
                        : t("person.never"),
                    ],
                  ]}
                />
                {actions.some((action) => action !== "left") && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    {actions.includes("password") && (
                      <Button size="sm" variant="outline" onClick={() => open("password")}>
                        {t("actions.password")}
                      </Button>
                    )}
                    {actions.includes("role") && (
                      <Button size="sm" variant="outline" onClick={() => open("role")}>
                        {t("actions.role")}
                      </Button>
                    )}
                    {actions.includes("signInOff") && (
                      <Button size="sm" variant="ghost" onClick={() => open("signInOff")}>
                        {t("actions.signInOff")}
                      </Button>
                    )}
                    {actions.includes("signInOn") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={update.isPending}
                        onClick={() =>
                          update.mutate({
                            userId: account.id,
                            name: person.fullName,
                            body: { isActive: true },
                          })
                        }
                      >
                        {t("actions.signInOn")}
                      </Button>
                    )}
                  </div>
                )}
                {account.id === session.user.id && (
                  <p className="text-xs text-muted-foreground">{t("person.yourself")}</p>
                )}
              </div>
            ) : (
              <div className="grid justify-items-start gap-3">
                <p className="text-sm text-muted-foreground">{t("person.noSignIn")}</p>
                {actions.includes("account") && (
                  <Button size="sm" onClick={() => open("account")}>
                    <UserPlusIcon />
                    {t("actions.account")}
                  </Button>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title={t("person.tablesTitle")}
            action={
              person.isActive && (
                <Link
                  href={{ pathname: PAGE_PATHS.tables, query: { staff: person.id } }}
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  {t("person.manageTables")}
                  <ArrowRightIcon />
                </Link>
              )
            }
          >
            {person.tables.length ? (
              <ul className="flex flex-wrap gap-2">
                {person.tables.map((table) => (
                  <li
                    key={table.id}
                    className="grid h-10 min-w-12 place-items-center rounded-lg bg-primary-soft px-3 text-sm font-bold text-primary-soft-foreground"
                  >
                    {table.number}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("person.noTables")}</p>
            )}
          </Panel>
        </div>
      </div>

      <EmployeeSheet
        start={editing ? { person } : null}
        designations={designations ?? []}
        onClose={() => setEditing(false)}
      />
      <StaffDialog state={dialog} onClose={() => setDialog(null)} />
    </PageFrame>
  );
}
