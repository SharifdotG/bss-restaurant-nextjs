"use client";

import { useEffect } from "react";
import { CloudSlashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { StateCard } from "@/components/state-card";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { startSession, useSession } from "@/lib/session/client";

type SessionGateProps = {
  children: React.ReactNode;
  /** Shown to signed-out visitors instead of sending them to sign in. */
  signedOut?: React.ReactNode;
};

/** Confirms the session before rendering anything that needs it. */
export function SessionGate({ children, signedOut }: SessionGateProps) {
  const t = useTranslations("session");
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const redirects = signedOut === undefined;

  useEffect(() => {
    void startSession();
  }, []);

  useEffect(() => {
    if (session.status !== "anonymous" || !redirects) return;
    router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [session.status, pathname, router, redirects]);

  if (session.status === "authenticated") return children;
  if (session.status === "anonymous" && !redirects) return signedOut;

  if (session.status === "unavailable") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <StateCard
          icon={CloudSlashIcon}
          title={t("unavailable")}
          actions={
            <Button variant="outline" onClick={() => window.location.reload()}>
              {t("retry")}
            </Button>
          }
        >
          {t("unavailableHint")}
        </StateCard>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center" aria-busy>
      <p className="sr-only">{t("checking")}</p>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-brand-track">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
      </div>
    </main>
  );
}
