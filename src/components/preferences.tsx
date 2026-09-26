"use client";

import { useSyncExternalStore } from "react";
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { Segmented } from "@/components/ui/segmented";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const YEAR = 60 * 60 * 24 * 365;
const noop = () => () => {};

// next-themes only knows the theme after hydration.
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

export function LanguageSwitch() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const change = (next: Locale) => {
    // Remembered so the bare address opens in this language next time.
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${YEAR}; samesite=lax`;
    router.replace({ pathname, query: Object.fromEntries(searchParams) }, { locale: next });
  };

  return (
    <Segmented
      aria-label={t("language")}
      value={locale}
      onValueChange={change}
      options={routing.locales.map((value) => ({ value, label: t(`locales.${value}`) }))}
    />
  );
}

export function ThemeSwitch() {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <Segmented
      aria-label={t("theme")}
      value={mounted ? (theme ?? "system") : "system"}
      onValueChange={setTheme}
      options={[
        {
          value: "light",
          label: <SunIcon weight="duotone" aria-hidden />,
          ariaLabel: t("themes.light"),
        },
        {
          value: "dark",
          label: <MoonIcon weight="duotone" aria-hidden />,
          ariaLabel: t("themes.dark"),
        },
        {
          value: "system",
          label: <DesktopIcon weight="duotone" aria-hidden />,
          ariaLabel: t("themes.system"),
        },
      ]}
    />
  );
}
