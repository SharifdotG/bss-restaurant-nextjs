"use client";

import { useEffect, useState } from "react";
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useTranslations, type Messages } from "next-intl";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { api, unwrap } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import type { TokenOut } from "@/lib/api/schema";
import { signIn } from "@/lib/session/client";

type ProblemKey = keyof Messages["login"]["errors"];
type Problem = { key: ProblemKey; minutes?: number };
const API_PROBLEMS: ProblemKey[] = ["invalid_credentials", "account_disabled", "validation_error"];

// Only same-site paths, so the sign-in page can't be used to bounce people elsewhere.
const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";

export function LoginForm() {
  const t = useTranslations("login");
  const common = useTranslations("common");
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  const [restaurant, setRestaurant] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);

  // Also wakes the database on a cold start before anyone presses Sign in.
  useEffect(() => {
    unwrap(api.GET("/api/v1/public/restaurant"))
      .then((data) => setRestaurant(data.name))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setTimeout(() => setLockedUntil(0), lockedUntil - Date.now());
    return () => clearTimeout(timer);
  }, [lockedUntil]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    // Empty fields never reach the API; every attempt there counts toward the lockout.
    if (!email.includes("@") || !password) return setProblem({ key: "validation_error" });

    setPending(true);
    setProblem(null);

    let tokens: TokenOut;
    try {
      tokens = await unwrap(api.POST("/api/v1/auth/login", { body: { email, password } }));
    } catch (error) {
      setPending(false);
      if (!isApiError(error) || error.code === "network") return setProblem({ key: "network" });
      if (error.code === "rate_limited") {
        const seconds = error.body.retryAfter ?? 300;
        setLockedUntil(Date.now() + seconds * 1000);
        return setProblem({ key: "rate_limited", minutes: Math.ceil(seconds / 60) });
      }
      const key = API_PROBLEMS.find((code) => code === error.code) ?? "unknown";
      return setProblem({ key });
    }

    try {
      await signIn(tokens);
    } catch {
      setPending(false);
      return setProblem({ key: "session" });
    }
    router.replace(next);
  }

  const locked = lockedUntil > 0;
  const invalid = problem?.key === "invalid_credentials" || problem?.key === "validation_error";

  return (
    <div className="w-full max-w-[400px] rounded-2xl bg-card p-8 shadow-md">
      <div className="flex items-center gap-3">
        <BrandMark />
        <div className="min-w-0">
          <p className="truncate text-md font-semibold">{restaurant ?? common("product")}</p>
          {restaurant && <p className="text-sm text-muted-foreground">{common("product")}</p>}
        </div>
      </div>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <form onSubmit={submit} className="mt-6" noValidate>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="email">{t("email")}</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoFocus
              aria-invalid={invalid || undefined}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">{t("password")}</FieldLabel>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                maxLength={128}
                className="pr-11"
                aria-invalid={invalid || undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1 right-1 text-muted-foreground"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeSlashIcon weight="duotone" /> : <EyeIcon weight="duotone" />}
              </Button>
            </div>
          </Field>

          {problem && (
            <div
              role="alert"
              className="flex gap-2.5 rounded-md bg-tone-red-subtle px-3 py-2.5 text-sm text-tone-red-text"
            >
              <WarningCircleIcon weight="duotone" className="mt-px size-[18px] shrink-0" />
              <p>{t(`errors.${problem.key}`, { minutes: problem.minutes ?? 0 })}</p>
            </div>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={pending || locked}>
            {pending ? t("submitting") : t("submit")}
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
