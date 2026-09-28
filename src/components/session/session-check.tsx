"use client";

import { useEffect, useState } from "react";
import { SignOutIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { LiveChip } from "@/components/live-chip";
import { LanguageSwitch, ThemeSwitch } from "@/components/preferences";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { api, unwrap } from "@/lib/api/client";
import { dashboardQuery, restaurantQuery } from "@/lib/api/queries";
import type { UserRole } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { businessDate } from "@/lib/format";
import { startLive, stopLive } from "@/lib/live/socket";
import { serverNow, useLiveOrders, useLiveReservations, useLiveSynced } from "@/lib/live/store";
import { can, canOpen, landingPage, PAGES } from "@/lib/permissions";
import { signOut, useSession } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";

// A stand-in until the real shell arrives: it shows the data layer working end to end.

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 sm:text-right">{children}</dd>
    </div>
  );
}

const Pending = () => <Skeleton className="h-4 w-44 sm:ml-auto" />;
const Quiet = ({ children }: { children: React.ReactNode }) => (
  <span className="block text-muted-foreground">{children}</span>
);

function RestaurantRow() {
  const t = useTranslations("session.check");
  const format = useFormat();
  const { data } = useQuery(restaurantQuery);

  return (
    <Row label={t("restaurant")}>
      {data ? (
        <>
          <span className="font-medium">{data.name}</span>
          <Quiet>
            {t("charges", {
              vat: format.percent(data.vatPercent),
              service: format.percent(data.serviceChargePercent),
            })}
          </Quiet>
        </>
      ) : (
        <Pending />
      )}
    </Row>
  );
}

function TodayRows({ role }: { role: UserRole }) {
  const t = useTranslations("session.check");
  const format = useFormat();
  const allowed = can(role, "dashboard.view");
  const { data } = useQuery({ ...dashboardQuery, enabled: allowed });

  if (!allowed) {
    return (
      <Row label={t("today")}>
        <Quiet>{t("notForRole")}</Quiet>
      </Row>
    );
  }

  return (
    <>
      <Row label={t("today")}>
        {data ? (
          t("todaySummary", { sales: format.money(data.today.sales), orders: data.today.orders })
        ) : (
          <Pending />
        )}
      </Row>
      <Row label={t("open")}>
        {data ? (
          t("openSummary", {
            orders: data.openOrders.total,
            occupied: data.tables.occupied,
            tables: data.tables.total,
          })
        ) : (
          <Pending />
        )}
      </Row>
    </>
  );
}

function LiveRow() {
  const t = useTranslations("session.check");
  const orders = useLiveOrders();
  const reservations = useLiveReservations();
  const synced = useLiveSynced();
  const today = businessDate(serverNow());
  const bookings = reservations.filter((r) => businessDate(r.startsAt) === today).length;

  return (
    <Row label={t("liveFeed")}>
      {synced ? (
        t("liveSummary", { orders: orders.length, bookings })
      ) : (
        <Quiet>{t("waiting")}</Quiet>
      )}
    </Row>
  );
}

function FormatsRow() {
  const t = useTranslations("session.check");
  const format = useFormat();
  const now = useNow(30_000);

  return (
    <Row label={t("formats")}>
      {format.money(123456.5)} · {format.time(now)}
      <Quiet>
        {format.relative(now - 5 * 60_000, now)} · {format.day(businessDate(now))}
      </Quiet>
    </Row>
  );
}

function PagesRow({ role }: { role: UserRole }) {
  const t = useTranslations("session.check");
  const nav = useTranslations("nav");
  const pages = PAGES.filter((page) => canOpen(role, page)).map((page) => nav(page));

  return (
    <Row label={t("pages")}>
      <span className="text-balance">{pages.join(", ")}</span>
      <Quiet>{t("landing", { page: nav(landingPage(role)) })}</Quiet>
    </Row>
  );
}

function ErrorRow() {
  const t = useTranslations("session.check");
  const errorText = useErrorText();
  const [error, setError] = useState<unknown>(null);

  async function tryMissingOrder() {
    setError(null);
    try {
      await unwrap(
        api.GET("/api/v1/orders/{order_id}", { params: { path: { order_id: 999_999 } } }),
      );
    } catch (caught) {
      setError(caught);
    }
  }

  return (
    <Row label={t("errorCheck")}>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Button variant="outline" size="sm" onClick={tryMissingOrder}>
          {t("tryError")}
        </Button>
        {error !== null && (
          <span role="status" className="text-tone-red-text">
            {errorText.message(error)}
          </span>
        )}
      </div>
    </Row>
  );
}

export function SessionCheck() {
  const t = useTranslations("session");
  const session = useSession();
  const router = useRouter();
  const now = useNow();
  const [check, setCheck] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    startLive();
    return () => stopLive();
  }, []);

  if (session.status !== "authenticated") return null;
  const { user } = session;
  const secondsLeft = Math.max(0, Math.round((session.expiresAt - now) / 1000));

  async function callMe() {
    setCheck("…");
    try {
      const me = await unwrap(api.GET("/api/v1/auth/me"));
      setCheck(`${t("ok")} · ${me.fullName}`);
    } catch (error) {
      setCheck(error instanceof Error ? error.message : "network");
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
      <div className="w-full max-w-[540px] rounded-2xl bg-card p-6 shadow-md sm:p-8">
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
          <RestaurantRow />
          <TodayRows role={user.role} />
          <LiveRow />
          <FormatsRow />
          <PagesRow role={user.role} />
          <Row label={t("tokenExpires", { seconds: secondsLeft })}>
            <div className="flex items-center gap-3 sm:justify-end">
              {check && <span className="font-medium">{check}</span>}
              <Button variant="outline" size="sm" onClick={callMe}>
                {t("callMe")}
              </Button>
            </div>
          </Row>
          <ErrorRow />
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
