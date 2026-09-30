"use client";

import { ArrowLeftIcon, HammerIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { StateCard } from "@/components/state-card";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { UserRole } from "@/lib/api/schema";
import { canOpen, landingPage, landingPath, type Page } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { PageHeader } from "./page-header";

type PageFrameProps = {
  page: Page;
  /** Overrides the page's name, for detail pages ("Order 22"). */
  title?: string;
  crumb?: string;
  parent?: { label: string; href: string };
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Every app page goes through here: the role check first, then the header and the page. */
export function PageFrame({ page, title, crumb, parent, meta, actions, children }: PageFrameProps) {
  const nav = useTranslations("nav");
  const session = useSession();
  if (session.status !== "authenticated") return null;
  const { user } = session;

  if (!canOpen(user.role, page)) {
    return <RoleDenied page={page} name={user.fullName} role={user.role} />;
  }

  return (
    <>
      <PageHeader
        title={title ?? nav(page)}
        crumb={crumb}
        parent={parent}
        meta={meta}
        actions={actions}
      />
      {children}
    </>
  );
}

// Pages only managers can open read "Reports are for managers"; the rest name the role.
const managerOnly = (page: Page) =>
  !canOpen("cashier", page) && !canOpen("waiter", page) && !canOpen("chef", page);

function RoleDenied({ page, name, role }: { page: Page; name: string; role: UserRole }) {
  const t = useTranslations("shell.denied");
  const nav = useTranslations("nav");
  const roles = useTranslations("session.roles");
  const pageName = nav(page);

  return (
    <div className="grid flex-1 place-items-center py-10">
      <StateCard
        icon={LockSimpleIcon}
        title={
          managerOnly(page)
            ? t("managersOnly", { page: pageName })
            : t("notYourRole", { page: pageName })
        }
        actions={
          <Link href={landingPath(role)} className={buttonVariants({ variant: "secondary" })}>
            <ArrowLeftIcon />
            {t("back", { page: nav(landingPage(role)) })}
          </Link>
        }
      >
        {t("signedInAs", { name, role: roles(role).toLowerCase() })}
      </StateCard>
    </div>
  );
}

/** Stands in for a page that a later update builds; the header and role check are already real. */
export function PlannedPage({ page }: { page: Page }) {
  const t = useTranslations("shell.planned");
  const meta = useTranslations("pages");
  const nav = useTranslations("nav");

  return (
    <PageFrame page={page} meta={meta(page)}>
      <div className="grid flex-1 place-items-start pt-2 md:place-items-center md:pb-24">
        <StateCard icon={HammerIcon} title={t("title", { page: nav(page) })}>
          {t("body")}
        </StateCard>
      </div>
    </PageFrame>
  );
}
