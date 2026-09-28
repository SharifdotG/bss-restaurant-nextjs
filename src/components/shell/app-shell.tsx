"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePathname } from "@/i18n/navigation";
import { startLive, stopLive } from "@/lib/live/socket";
import { pageForPath } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useShellLayout } from "@/lib/use-shell-layout";
import { BottomTabs } from "./bottom-tabs";
import { ConnectionBanner } from "./connection-banner";
import { Sidebar, SidebarContent } from "./sidebar";
import { TopBar } from "./top-bar";

type AppShellProps = {
  children: React.ReactNode;
  /** A 404: no nav item is current, even when the address starts like one. */
  lost?: boolean;
};

/** Sidebar, top bar and phone tabs around every signed-in page. */
export function AppShell({ children, lost = false }: AppShellProps) {
  const t = useTranslations("shell");
  const session = useSession();
  const layout = useShellLayout();
  const pathname = usePathname();
  const current = lost ? null : pageForPath(pathname);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // One socket for the whole signed-in app.
  useEffect(() => {
    startLive();
    return () => stopLive();
  }, []);

  if (session.status !== "authenticated") return null;
  const { role } = session.user;

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh">
        {(layout === "full" || layout === "rail") && (
          <Sidebar variant={layout} role={role} current={current} />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {layout !== "phone" && (
            <TopBar onOpenMenu={layout === "drawer" ? () => setDrawerOpen(true) : undefined} />
          )}
          <ConnectionBanner />
          <main
            id="main"
            className="flex flex-1 flex-col px-4 pt-5 pb-28 md:px-6 md:pt-2 md:pb-10 xl:px-8"
          >
            {children}
          </main>
        </div>

        {layout === "drawer" && (
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent side="left" className="bg-sidebar">
              <SheetTitle className="sr-only">{t("mainNav")}</SheetTitle>
              <SheetDescription className="sr-only">{t("moreHint")}</SheetDescription>
              <SidebarContent
                variant="drawer"
                role={role}
                current={current}
                onNavigate={() => setDrawerOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}
        {layout === "phone" && <BottomTabs role={role} current={current} />}
      </div>
    </TooltipProvider>
  );
}
