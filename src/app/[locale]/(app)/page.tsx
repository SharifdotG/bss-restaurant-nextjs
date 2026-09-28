import { setRequestLocale } from "next-intl/server";
import { LandingRedirect } from "@/components/shell/landing-redirect";
import { asLocale } from "@/i18n/routing";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  return <LandingRedirect />;
}
