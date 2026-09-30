import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlannedPage } from "@/components/shell/page-frame";
import { asLocale } from "@/i18n/routing";
import type { Page } from "@/lib/permissions";

type Params = { params: Promise<{ locale: string }> };

function metadataFor(page: Page) {
  return async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale: asLocale(locale), namespace: "nav" });
    return { title: t(page) };
  };
}

/**
 * A static page whose body runs in the browser. The Suspense boundary lets it read the
 * address (filters, tabs) without opting the whole route out of prerendering.
 */
export function pageRoute(page: Page, Body: React.ComponentType) {
  async function Route({ params }: Params) {
    const { locale } = await params;
    setRequestLocale(asLocale(locale));
    return (
      <Suspense>
        <Body />
      </Suspense>
    );
  }

  return { generateMetadata: metadataFor(page), Route };
}

/** Metadata and body for a page whose screen arrives in a later update. */
export function plannedRoute(page: Page) {
  return pageRoute(page, function Planned() {
    return <PlannedPage page={page} />;
  });
}
