"use client";

import { useEffect, useState } from "react";
import { SignOutIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { LiveChip } from "@/components/live-chip";
import { LanguageSwitch, ThemeSwitch } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { ApiError, apiFetch } from "@/lib/api/fetch";
import type { User } from "@/lib/api/types";
import { startLive, stopLive } from "@/lib/live/socket";
import { signOut, useSession } from "@/lib/session/client";

function useSecondsLeft(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, Math.round((until - now) / 1000));
}

export function SessionCheck() {
  const t = useTranslations("session");
  const session = useSession();
  const router = useRouter();
  const [check, setCheck] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const expiresAt = session.status === "authenticated" ? session.expiresAt : 0;
  const secondsLeft = useSecondsLeft(expiresAt);

  useEffect(() => {
    startLive();
    return () => stopLive();
  }, []);

  if (session.status !== "authenticated") return null;
  const { user } = session;

  async function callMe() {
    setCheck("…");
    try {
      const me = await apiFetch<User>("/auth/me");
      setCheck(`${t("ok")} · ${me.fullName}`);
    } catch (error) {
      setCheck(error instanceof ApiError ? `${error.status} ${error.code}` : "network");
    }
  }

  async function leave() {
    setLeaving(true);
    stopLive();
    await signOut();
    router.replace("/login");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-[440px] rounded-2xl bg-card p-8 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <LiveChip />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">{t("signedInAs")}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{user.fullName}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-medium text-primary-soft-foreground">
            {t(`roles.${user.role}`)}
          </span>
          <span className="truncate">{user.email}</span>
        </div>

        <dl className="mt-6 divide-y divide-border border-y border-border text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">{t("tokenExpires", { seconds: secondsLeft })}</dt>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">{t("apiCheck")}</dt>
            <dd className="flex items-center gap-3">
              {check && <span className="font-medium">{check}</span>}
              <Button variant="outline" size="sm" onClick={callMe}>
                {t("callMe")}
              </Button>
            </dd>
          </div>
        </dl>

        <Button variant="ghost" className="mt-5 -ml-2" onClick={leave} disabled={leaving}>
          <SignOutIcon weight="duotone" />
          {leaving ? t("signingOut") : t("signOut")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <LanguageSwitch />
        <ThemeSwitch />
      </div>
    </main>
  );
}
