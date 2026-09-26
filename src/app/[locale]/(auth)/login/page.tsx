import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { asLocale } from "@/i18n/routing";
import { LoginForm } from "@/components/auth/login-form";
import { LanguageSwitch, ThemeSwitch } from "@/components/preferences";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: asLocale(locale), namespace: "login" });
  return { title: t("title") };
}

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Suspense>
          <LanguageSwitch />
        </Suspense>
        <ThemeSwitch />
      </div>
    </main>
  );
}
