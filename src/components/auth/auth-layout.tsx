"use client";

import Image from "next/image";
import { ClockIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitch, ThemeToggle } from "@/components/preferences";
import { Skeleton } from "@/components/ui/skeleton";
import { publicRestaurantQuery } from "@/lib/api/queries";
import { useFormat } from "@/lib/use-format";
import photo from "@/assets/sign-in-biryani.webp";

const PHOTO_CREDIT = {
  name: "HAIZAM MUHAMMED",
  href: "https://unsplash.com/photos/a-bowl-of-food-on-a-black-table-xL0uEoH7L9E",
};

/** Sign-in and the signed-out 404: the form on the left, the restaurant on the right. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("login");
  const restaurant = useQuery(publicRestaurantQuery).data;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10 sm:py-8 lg:px-12">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <div className="min-w-0">
              {restaurant ? (
                <p className="truncate text-md leading-tight font-bold">{restaurant.name}</p>
              ) : (
                <Skeleton className="my-0.5 h-4 w-32" />
              )}
              <p className="text-xs text-muted-foreground">{t("staffSignIn")}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <LanguageSwitch short />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">{children}</div>
        </main>

        <p className="text-xs text-muted-foreground">{t("noAccount")}</p>
      </div>

      <RestaurantPanel />
    </div>
  );
}

function RestaurantPanel() {
  const t = useTranslations("login");
  const format = useFormat();
  const restaurant = useQuery(publicRestaurantQuery).data;

  return (
    <aside className="relative m-5 hidden overflow-hidden rounded-2xl lg:block">
      {/* The panel is a dark surface in both themes, so its tokens come from .dark. */}
      <div className="dark absolute inset-0 bg-background text-foreground">
        <m.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
        >
          <Image
            src={photo}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="50vw"
            className="object-cover object-[70%_50%]"
          />
        </m.div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-x-7 bottom-7">
          {restaurant ? (
            <>
              <p className="text-4xl font-bold tracking-tight text-balance">{restaurant.name}</p>
              {restaurant.address && (
                <p className="mt-2 max-w-[48ch] text-md text-muted-foreground">
                  {restaurant.address}
                </p>
              )}
            </>
          ) : (
            <Skeleton className="h-9 w-64" />
          )}
          <p className="mt-3 text-2xs text-muted-foreground">
            {t.rich("photoCredit", {
              name: PHOTO_CREDIT.name,
              link: (chunks) => (
                <a
                  href={PHOTO_CREDIT.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-from-font hover:text-foreground"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
      </div>

      {restaurant && (
        <div className="absolute top-7 left-7 flex items-center gap-3.5 rounded-xl bg-card py-3.5 pr-5 pl-3.5 shadow-md">
          <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
            <ClockIcon weight="duotone" className="size-6" />
          </span>
          <div>
            <p className="text-xs text-muted-foreground">{t("openToday")}</p>
            <p className="text-md font-bold">
              {format.clock(restaurant.opensAt)} – {format.clock(restaurant.closesAt)}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
