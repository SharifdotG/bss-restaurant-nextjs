import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlannedPage } from "@/components/shell/page-frame";
import { asLocale } from "@/i18n/routing";
import type { Page } from "@/lib/permissions";

type Params = { params: Promise<{ locale: string }> };

/** Metadata and body for a page whose screen arrives in a later update. */
export function plannedRoute(page: Page) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale: asLocale(locale), namespace: "nav" });
    return { title: t(page) };
  }

  async function Route({ params }: Params) {
    const { locale } = await params;
    setRequestLocale(asLocale(locale));
    return <PlannedPage page={page} />;
  }

  return { generateMetadata, Route };
}
