"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EyeIcon, EyeSlashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { api, unwrap } from "@/lib/api/client";
import { isApiError } from "@/lib/api/errors";
import { publicRestaurantQuery } from "@/lib/api/queries";
import type { TokenOut } from "@/lib/api/schema";
import { useErrorText } from "@/lib/api/use-error-text";
import { signIn } from "@/lib/session/client";

// Our own checks have their own wording; anything from the API goes through useErrorText.
type Problem = { local: "missing" | "session" } | { error: unknown };

// Only same-site paths, so the sign-in page can't be used to bounce people elsewhere.
const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";

export function LoginForm() {
  const t = useTranslations("login");
  const common = useTranslations("common");
  const errorText = useErrorText();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));

  const restaurant = useQuery(publicRestaurantQuery).data?.name;
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [lockedUntil, setLockedUntil] = useState(0);

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
    if (!email.includes("@") || !password) return setProblem({ local: "missing" });

    setPending(true);
    setProblem(null);

    let tokens: TokenOut;
    try {
      tokens = await unwrap(api.POST("/api/v1/auth/login", { body: { email, password } }));
    } catch (error) {
      setPending(false);
      if (isApiError(error) && error.code === "rate_limited") {
        setLockedUntil(Date.now() + (error.body.retryAfter ?? 300) * 1000);
      }
      return setProblem({ error });
    }

    try {
      await signIn(tokens);
    } catch {
      setPending(false);
      return setProblem({ local: "session" });
    }
    router.replace(next);
  }

  const locked = lockedUntil > 0;
  const invalid =
    problem !== null &&
    ("local" in problem
      ? problem.local === "missing"
      : isApiError(problem.error) && problem.error.code === "invalid_credentials");

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
              <p>
                {"local" in problem
                  ? t(`errors.${problem.local}`)
                  : errorText.message(problem.error)}
              </p>
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
