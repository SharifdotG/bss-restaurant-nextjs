import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PersonPage } from "@/components/staff/person-page";
import { asLocale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string; id: string }> };

// Like orders: each person's shell renders on its first visit and is cached after.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: asLocale(locale), namespace: "nav" });
  return { title: t("staff") };
}

export default async function PersonRoute({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  return (
    <Suspense>
      <PersonPage />
    </Suspense>
  );
}
