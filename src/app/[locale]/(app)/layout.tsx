import { setRequestLocale } from "next-intl/server";
import { AppShell } from "@/components/shell/app-shell";
import { SessionGate } from "@/components/session/session-gate";
import { asLocale } from "@/i18n/routing";

export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(asLocale(locale));
  return (
    <SessionGate>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
