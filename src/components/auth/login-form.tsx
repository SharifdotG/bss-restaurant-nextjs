"use client";

import { useEffect, useState } from "react";
import {
  CashRegisterIcon,
  ChartBarIcon,
  ChefHatIcon,
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  ForkKnifeIcon,
  LockSimpleIcon,
  TimerIcon,
  WarningCircleIcon,
  type Icon,
} from "@phosphor-icons/react";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { IconInput } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { api, unwrap } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { useErrorText } from "@/lib/api/use-error-text";
import { DEMO_ENABLED, DEMO_ROLES, demoLogin, type DemoRole } from "@/lib/demo";
import { signIn } from "@/lib/session/client";
import { useFormat } from "@/lib/use-format";
import { useNow } from "@/lib/use-now";

type Problem =
  | { kind: "missing" | "session" | "wrong" }
  | { kind: "locked"; email: string; until: number; minutes: number }
  | { kind: "failed"; error: unknown };

// Only same-site paths, so the sign-in page can't be used to bounce people elsewhere.
const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";

const DEMO_ICONS: Record<DemoRole, Icon> = {
  manager: ChartBarIcon,
  waiter: ForkKnifeIcon,
  chef: ChefHatIcon,
  cashier: CashRegisterIcon,
};

// The form settles in as one short sequence; reduced motion keeps only the fade.
const rise = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.2, 0, 0, 1] } },
} as const;

export function LoginForm() {
  const t = useTranslations("login");
  const roles = useTranslations("session.roles");
  const errorText = useErrorText();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState<"form" | DemoRole | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  const locked = problem?.kind === "locked" ? problem : null;
  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => setProblem(null), locked.until - Date.now());
    return () => clearTimeout(timer);
  }, [locked]);

  async function attempt(email: string, password: string, who: "form" | DemoRole) {
    setPending(who);
    setProblem(null);
    try {
      const tokens = await unwrap(api.POST("/api/v1/auth/login", { body: { email, password } }));
      try {
        await signIn(tokens, { remember });
      } catch {
        setPending(null);
        return setProblem({ kind: "session" });
      }
      router.replace(next);
    } catch (error) {
      setPending(null);
      if (!isApiError(error)) return setProblem({ kind: "failed", error });
      if (error.code === "invalid_credentials") return setProblem({ kind: "wrong" });
      if (error.code === "rate_limited") {
        const seconds = error.body.retryAfter ?? 300;
        return setProblem({
          kind: "locked",
          email,
          until: Date.now() + seconds * 1000,
          minutes: Math.max(1, Math.round(seconds / 60)),
        });
      }
      setProblem({ kind: "failed", error });
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    // Empty fields never reach the API; every attempt there counts toward the lockout.
    if (!email.includes("@") || !password) return setProblem({ kind: "missing" });
    void attempt(email, password, "form");
  }

  const busy = pending !== null || locked !== null;
  const wrong = problem?.kind === "wrong";
  const missing = problem?.kind === "missing";

  return (
    <m.div initial="hidden" animate="shown" transition={{ staggerChildren: 0.05 }}>
      <m.h1 variants={rise} className="text-3xl font-bold tracking-tight text-balance">
        {t("title")}
      </m.h1>
      <m.p variants={rise} className="mt-2 text-base text-muted-foreground">
        {t("subtitle")}
      </m.p>

      {problem && problem.kind !== "missing" && (
        <div className="mt-6">
          <ProblemAlert problem={problem} message={errorText.message} />
        </div>
      )}

      <m.form variants={rise} onSubmit={submit} className="mt-6" noValidate>
        <FieldGroup className="gap-5">
          <Field>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <IconInput
              icon={EnvelopeSimpleIcon}
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoFocus
              className="h-11"
              aria-invalid={missing || undefined}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <IconInput
              icon={LockSimpleIcon}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              maxLength={128}
              className="h-11"
              aria-invalid={wrong || missing || undefined}
              aria-describedby="password-help"
              end={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeSlashIcon weight="duotone" /> : <EyeIcon weight="duotone" />}
                </Button>
              }
            />
            <p id="password-help" className="text-xs text-muted-foreground">
              {missing ? (
                <span className="font-medium text-tone-red-text">{t("errors.missing")}</span>
              ) : (
                t("forgot")
              )}
            </p>
          </Field>

          <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm select-none">
            <Checkbox checked={remember} onCheckedChange={setRemember} />
            {t("remember")}
          </label>

          <Button type="submit" size="lg" className="h-12 w-full text-md" disabled={busy}>
            {locked ? (
              <Countdown until={locked.until} />
            ) : pending === "form" ? (
              t("submitting")
            ) : (
              t("submit")
            )}
          </Button>
        </FieldGroup>
      </m.form>

      {DEMO_ENABLED && (
        <m.div variants={rise} className="mt-8">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {t("orDemo")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {DEMO_ROLES.map((role) => {
              const RoleIcon = DEMO_ICONS[role];
              return (
                <Button
                  key={role}
                  type="button"
                  variant="outline"
                  className="h-11 justify-start gap-2.5 px-4"
                  // A lockout is per email, so the other accounts stay open.
                  disabled={pending !== null}
                  onClick={() => {
                    const login = demoLogin(role);
                    void attempt(login.email, login.password, role);
                  }}
                >
                  <RoleIcon weight="duotone" className="text-primary" />
                  {pending === role ? t("demoOpening") : roles(role)}
                </Button>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-pretty text-muted-foreground">{t("demoNote")}</p>
        </m.div>
      )}
    </m.div>
  );
}

function Countdown({ until }: { until: number }) {
  const t = useTranslations("login");
  const format = useFormat();
  const now = useNow(1000);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  const time = `${format.number(Math.floor(seconds / 60))}:${format.number(seconds % 60, { minimumIntegerDigits: 2 })}`;
  return t("tryAgainIn", { time });
}

function ProblemAlert({
  problem,
  message,
}: {
  problem: Exclude<Problem, { kind: "missing" }>;
  message: (error: unknown) => string;
}) {
  const t = useTranslations("login");
  const format = useFormat();

  switch (problem.kind) {
    case "wrong":
      return (
        <Alert tone="red" icon={WarningCircleIcon} title={t("wrongTitle")}>
          {t("wrongBody")}
        </Alert>
      );
    case "locked":
      return (
        <Alert tone="amber" icon={TimerIcon} title={t("lockedTitle")}>
          {t("lockedBody", {
            email: problem.email,
            minutes: problem.minutes,
            time: format.time(problem.until),
          })}
        </Alert>
      );
    case "session":
      return (
        <Alert tone="red" icon={WarningCircleIcon} title={t("failedTitle")}>
          {t("errors.session")}
        </Alert>
      );
    case "failed":
      return (
        <Alert tone="red" icon={WarningCircleIcon} title={t("failedTitle")}>
          {message(problem.error)}
        </Alert>
      );
  }
}
