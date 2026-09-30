/* eslint-disable @next/next/no-img-element -- the API serves one resized WebP; next/image would only spend quota */
import { BowlFoodIcon } from "@phosphor-icons/react";
import { imageUrl } from "@/lib/api/images";
import { cn } from "@/lib/utils";

type FoodThumbProps = { src: string | null | undefined; className?: string };

/** A dish photo, or a quiet bowl when there isn't one. Most menus start without photos. */
export function FoodThumb({ src, className }: FoodThumbProps) {
  const url = imageUrl(src);
  return (
    <span
      className={cn(
        "grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary-soft text-primary-soft-foreground",
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <BowlFoodIcon weight="duotone" className="size-1/2" />
      )}
    </span>
  );
}
