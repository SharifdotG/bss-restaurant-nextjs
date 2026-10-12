"use client";

import Image from "next/image";
import {
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  QrCodeIcon,
  BellRingingIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import * as m from "motion/react-m";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/components/brand-mark";
import { LanguageSwitch } from "@/components/preferences";
import { StateCard } from "@/components/state-card";
import { Skeleton } from "@/components/ui/skeleton";
import { publicRestaurantQuery, publicTableQuery } from "@/lib/api/queries";
import { useFormat } from "@/lib/use-format";
import photo from "@/assets/sign-in-biryani.webp";

/**
 * Where a table's QR code lands. Ordering from the phone comes later; for now it greets the
 * guest at the right table and says how to order, so printed cards are already useful.
 */
export function TableWelcome({ token }: { token: string }) {
  const t = useTranslations("guest");
  const format = useFormat();
  const restaurant = useQuery(publicRestaurantQuery).data;
  const table = useQuery(publicTableQuery(token));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          {restaurant ? (
            <p className="truncate text-md font-bold">{restaurant.name}</p>
          ) : (
            <Skeleton className="h-5 w-36" />
          )}
        </div>
        <LanguageSwitch short />
      </header>

      <main className="flex flex-1 flex-col justify-center gap-4 py-8">
        {table.isError ? (
          <StateCard icon={QrCodeIcon} title={t("deadTitle")}>
            {t("deadBody")}
          </StateCard>
        ) : (
          <m.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
            className="overflow-hidden rounded-2xl bg-card shadow-md"
          >
            <div className="relative h-40">
              <Image
                src={photo}
                alt=""
                fill
                priority
                placeholder="blur"
                sizes="448px"
                className="object-cover"
              />
            </div>
            <div className="px-6 pt-5 pb-6 text-center">
              <h1 className="text-sm text-muted-foreground">
                {t("atTable")}
                {table.data && <span className="sr-only"> {table.data.number}</span>}
              </h1>
              {table.data ? (
                <>
                  <p className="mt-1 text-6xl leading-none font-bold tracking-tight">
                    {table.data.number}
                  </p>
                  {table.data.location && (
                    <p className="mt-2 text-sm text-muted-foreground">{table.data.location}</p>
                  )}
                </>
              ) : (
                <Skeleton className="mx-auto mt-2 h-14 w-24" />
              )}
              <p className="mt-6 flex items-start gap-3 rounded-xl bg-primary-soft px-4 py-3 text-left text-sm text-primary-soft-foreground">
                <BellRingingIcon weight="duotone" className="mt-0.5 size-5 shrink-0" />
                {t("soon")}
              </p>
            </div>
          </m.section>
        )}

        {restaurant && (
          <ul className="grid gap-3 rounded-2xl bg-card px-5 py-4 text-sm shadow-md">
            <li className="flex items-center gap-3">
              <ClockIcon weight="duotone" className="size-5 shrink-0 text-muted-foreground" />
              {t("hours", {
                from: format.clock(restaurant.opensAt),
                to: format.clock(restaurant.closesAt),
              })}
            </li>
            {restaurant.address && (
              <li className="flex items-center gap-3">
                <MapPinIcon weight="duotone" className="size-5 shrink-0 text-muted-foreground" />
                {restaurant.address}
              </li>
            )}
            {restaurant.phone && (
              <li className="flex items-center gap-3">
                <PhoneIcon weight="duotone" className="size-5 shrink-0 text-muted-foreground" />
                <a
                  href={`tel:${restaurant.phone}`}
                  className="font-bold tabular-nums hover:underline"
                >
                  {restaurant.phone}
                </a>
              </li>
            )}
          </ul>
        )}
      </main>
    </div>
  );
}
