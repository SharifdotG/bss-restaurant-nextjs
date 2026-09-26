"use client";

import { useEffect } from "react";
import { CloudSlashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "@/i18n/navigation";
import { startSession, useSession } from "@/lib/session/client";

/** Confirms the session before rendering anything that needs it. */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations("session");
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    void startSession();
  }, []);

  useEffect(() => {
    if (session.status !== "anonymous") return;
    router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
  }, [session.status, pathname, router]);

  if (session.status === "authenticated") return children;

  if (session.status === "unavailable") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-tone-slate-subtle text-tone-slate-text">
            <CloudSlashIcon weight="duotone" className="size-6" />
          </span>
          <h1 className="mt-4 text-lg font-semibold">{t("unavailable")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("unavailableHint")}</p>
          <Button variant="outline" className="mt-5" onClick={() => window.location.reload()}>
            {t("retry")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-dvh place-items-center" aria-busy>
      <p className="sr-only">{t("checking")}</p>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-brand-track">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand" />
      </div>
    </main>
  );
}
