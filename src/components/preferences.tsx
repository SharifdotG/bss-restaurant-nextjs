"use client";

import { useSyncExternalStore } from "react";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const YEAR = 60 * 60 * 24 * 365;
const noop = () => () => {};

// next-themes only knows the theme after hydration.
export const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/** Switches language in place, keeping the page and its query. */
export function useChangeLocale() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (next: Locale) => {
    // Remembered so the bare address opens in this language next time.
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${YEAR}; samesite=lax`;
    router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale: next });
  };
}

/** English / Bangla. `short` gives EN / বাং for the top bar. */
export function LanguageSwitch({ short = false, fill }: { short?: boolean; fill?: boolean }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const change = useChangeLocale();

  return (
    <Segmented
      aria-label={t("language")}
      value={locale}
      onValueChange={change}
      fill={fill}
      options={routing.locales.map((value) => ({
        value,
        label: t(short ? `localesShort.${value}` : `locales.${value}`),
        ariaLabel: short ? t(`locales.${value}`) : undefined,
      }))}
    />
  );
}

const THEME_ICONS = { light: SunIcon, dark: MoonIcon, system: DesktopIcon };

/** Light, dark or follow the device. `labelled` swaps the icons for words. */
export function ThemeSwitch({ labelled, fill }: { labelled?: boolean; fill?: boolean }) {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <Segmented
      aria-label={t("theme")}
      value={mounted ? (theme ?? "system") : "system"}
      onValueChange={setTheme}
      fill={fill}
      options={(["light", "dark", "system"] as const).map((value) => {
        const Icon = THEME_ICONS[value];
        return labelled
          ? { value, label: t(`themes.${value}`) }
          : {
              value,
              label: <Icon weight="duotone" aria-hidden />,
              ariaLabel: t(`themes.${value}`),
            };
      })}
    />
  );
}

/** One button that flips between light and dark, for tight spots like the top bar. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("common.themes");
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("shrink-0", className)}
      aria-label={dark ? t("light") : t("dark")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon weight="duotone" /> : <MoonIcon weight="duotone" />}
    </Button>
  );
}
