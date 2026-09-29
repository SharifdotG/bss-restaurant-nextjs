"use client";

import { ArrowLeftIcon, QuestionIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { usePathname as useFullPathname } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SessionGate } from "@/components/session/session-gate";
import { StateCard } from "@/components/state-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { landingPage, landingPath } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { AppShell } from "./app-shell";

/** Signed in, a 404 sits inside the shell; signed out, it points to sign in. */
export function NotFoundScreen() {
  return (
    <SessionGate signedOut={<SignedOutNotFound />}>
      <AppShell lost>
        <SignedInNotFound />
      </AppShell>
    </SessionGate>
  );
}

function SignedInNotFound() {
  const t = useTranslations("shell.notFound");
  const nav = useTranslations("nav");
  const session = useSession();
  const router = useRouter();
  // The full address, locale included, so it reads exactly as it was typed.
  const address = useFullPathname();
  if (session.status !== "authenticated") return null;
  const { role } = session.user;

  return (
    <div className="grid flex-1 place-items-center py-10">
      <StateCard
        icon={QuestionIcon}
        title={t("title")}
        actions={
          <>
            <Button
              variant="outline"
              // Opened from a pasted link there's nothing to go back to.
              onClick={() =>
                window.history.length > 1 ? router.back() : router.replace(landingPath(role))
              }
            >
              <ArrowLeftIcon />
              {t("back")}
            </Button>
            <Link href={landingPath(role)} className={buttonVariants()}>
              {t("open", { page: nav(landingPage(role)) })}
            </Link>
          </>
        }
      >
        {t.rich("body", {
          path: () => <span className="font-medium break-all text-foreground">{address}</span>,
        })}
      </StateCard>
    </div>
  );
}

function SignedOutNotFound() {
  const t = useTranslations("shell.notFound");
  return (
    <AuthLayout>
      <span className="grid size-14 place-items-center rounded-xl bg-tone-slate-subtle text-tone-slate-text">
        <QuestionIcon weight="duotone" className="size-7" />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-balance">{t("signedOutTitle")}</h1>
      <p className="mt-2 text-md text-pretty text-muted-foreground">{t("signedOutBody")}</p>
      <Link href="/login" className={buttonVariants({ size: "lg", className: "mt-8 h-12 w-full" })}>
        {t("signIn")}
      </Link>
    </AuthLayout>
  );
}
