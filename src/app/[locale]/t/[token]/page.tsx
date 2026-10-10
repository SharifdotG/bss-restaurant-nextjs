import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TableWelcome } from "@/components/guest/table-welcome";
import { asLocale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string; token: string }> };

// Built on the first scan of each code and cached after; the table itself loads in the browser.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: asLocale(locale), namespace: "guest" });
  return { title: t("title") };
}

export default async function TableRoute({ params }: Params) {
  const { locale, token } = await params;
  setRequestLocale(asLocale(locale));
  return (
    <Suspense>
      <TableWelcome token={token} />
    </Suspense>
  );
}
