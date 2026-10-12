"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { IncomingSheet } from "@/components/incoming/incoming-sheet";
import { IncomingWatcher } from "@/components/incoming/incoming-watcher";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePathname } from "@/i18n/navigation";
import { startLive, stopLive } from "@/lib/live/socket";
import { pageForPath } from "@/lib/permissions";
import { useSession } from "@/lib/session/client";
import { useShellLayout } from "@/lib/use-shell-layout";
import { cn } from "@/lib/utils";
import { BottomTabs } from "./bottom-tabs";
import { ConnectionBanner } from "./connection-banner";
import { LazyCommandPalette } from "./lazy-command-palette";
import { AsideProvider, useAsideSlot } from "./shell-aside";
import { ShortcutsSheet } from "./shortcuts-sheet";
import { Sidebar, SidebarContent } from "./sidebar";
import { SignOutAllDialog } from "./sign-out-all-dialog";
import { TopBar } from "./top-bar";
import { useShortcuts } from "./use-shortcuts";

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
  const aside = useAsideSlot();
  // The POS and the till need the width for their side panels, so they keep to the rail.
  const compact = current === "newOrder" || current === "billing";
  // The phone POS is a full-screen flow with its own way out, so it has no bottom tabs.
  const flow = current === "newOrder";

  // One socket for the whole signed-in app.
  useEffect(() => {
    startLive();
    return () => stopLive();
  }, []);

  const role = session.status === "authenticated" ? session.user.role : null;
  useShortcuts(role);

  if (role === null) return null;

  const overlays = (
    <>
      <LazyCommandPalette />
      <ShortcutsSheet />
      <SignOutAllDialog />
      <IncomingSheet />
      <IncomingWatcher />
      <Toaster />
    </>
  );

  // The kitchen board runs full screen with its own header.
  if (current === "kitchen") {
    return (
      <TooltipProvider>
        <main id="main" className="flex min-h-dvh flex-col">
          {children}
        </main>
        {overlays}
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex min-h-dvh">
        {(layout === "full" || layout === "rail") && (
          <Sidebar
            variant={compact ? "rail" : layout}
            role={role}
            current={current}
            pinned={compact}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {layout !== "phone" && (
            <TopBar onOpenMenu={layout === "drawer" ? () => setDrawerOpen(true) : undefined} />
          )}
          <ConnectionBanner />
          <main
            id="main"
            className={cn(
              "flex flex-1 flex-col px-4 pt-5 md:px-6 md:pt-2 xl:px-8",
              // Room for the bottom tabs; the POS has its own bar down there instead.
              flow ? "pb-0 md:pb-6" : "pb-28 md:pb-10",
            )}
          >
            <AsideProvider value={aside.node}>{children}</AsideProvider>
          </main>
        </div>
        {aside.slot}

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
        {layout === "phone" && !flow && <BottomTabs role={role} current={current} />}
        {overlays}
      </div>
    </TooltipProvider>
  );
}
