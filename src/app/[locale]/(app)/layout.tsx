import { setRequestLocale } from "next-intl/server";
import { asLocale } from "@/i18n/routing";
import { SessionGate } from "@/components/session/session-gate";

export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  return <SessionGate>{children}</SessionGate>;
}
