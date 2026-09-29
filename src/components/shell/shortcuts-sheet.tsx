"use client";

import { useTranslations } from "next-intl";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { goShortcuts } from "@/lib/navigation";
import { useModKey, useOverlay, withMod } from "@/lib/overlays";
import { useSession } from "@/lib/session/client";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between gap-4 text-base">
      <dt>{label}</dt>
      <dd>
        <KbdGroup>{children}</KbdGroup>
      </dd>
    </div>
  );
}

/** Every keyboard shortcut this person can use, opened with "?" or from the account menu. */
export function ShortcutsSheet() {
  const t = useTranslations("shell.shortcuts");
  const nav = useTranslations("nav");
  const overlay = useOverlay("shortcuts");
  const mod = useModKey();
  const session = useSession();
  if (session.status !== "authenticated") return null;

  return (
    <Sheet {...overlay}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="gap-6">
          <section>
            <h3 className="mb-1 text-sm font-bold text-muted-foreground">{t("general")}</h3>
            <dl className="divide-y divide-border">
              <Row label={t("search")}>
                <Kbd>{withMod(mod, "K")}</Kbd>
              </Row>
              <Row label={t("sidebar")}>
                <Kbd>{withMod(mod, "B")}</Kbd>
              </Row>
              <Row label={t("help")}>
                <Kbd>?</Kbd>
              </Row>
            </dl>
          </section>
          <section>
            <h3 className="mb-1 text-sm font-bold text-muted-foreground">{t("goTo")}</h3>
            <dl className="divide-y divide-border">
              {goShortcuts(session.user.role).map(([page, key]) => (
                <Row key={page} label={nav(page)}>
                  <Kbd>G</Kbd>
                  <Kbd>{key.toUpperCase()}</Kbd>
                </Row>
              ))}
            </dl>
          </section>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
