import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "bn"],
  defaultLocale: "en",
  localePrefix: "always",
  // Staff pick a language once and keep it; the proxy handles first visits.
  localeCookie: { maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

// Route params arrive as plain strings; the [locale] layout has already 404'd anything unknown.
export const asLocale = (value: string): Locale =>
  (routing.locales as readonly string[]).includes(value)
    ? (value as Locale)
    : routing.defaultLocale;
