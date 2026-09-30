import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderDetailPage } from "@/components/orders/detail/order-detail-page";
import { asLocale } from "@/i18n/routing";

type Params = { params: Promise<{ locale: string; id: string }> };

// Nothing is built ahead: each order's shell renders on its first visit and is cached after.
// The order itself always loads in the browser.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: asLocale(locale), namespace: "nav" });
  return { title: t("orders") };
}

export default async function OrderRoute({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  return (
    <Suspense>
      <OrderDetailPage />
    </Suspense>
  );
}
