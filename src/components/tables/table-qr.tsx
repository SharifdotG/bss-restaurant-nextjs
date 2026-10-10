"use client";

import { useSyncExternalStore } from "react";
import { QRCodeSVG } from "qrcode.react";
import { qrLink } from "@/lib/tables";
import { cn } from "@/lib/utils";

const noop = () => () => {};

/**
 * A table's QR code. It's printed and scanned, so it stays black on white like paper in both
 * themes; dark modules on a light ground is what every phone camera reads best.
 */
export function TableQr({
  token,
  label,
  className,
}: {
  token: string;
  label: string;
  className?: string;
}) {
  // Cards are printed from the site guests should land on, so the link follows this origin.
  const origin = useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );

  return (
    <span className={cn("grid place-items-center rounded-lg bg-white p-2 text-black", className)}>
      {origin && (
        <QRCodeSVG
          value={qrLink(origin, token)}
          level="M"
          marginSize={0}
          bgColor="transparent"
          fgColor="currentColor"
          title={label}
          className="size-full"
        />
      )}
    </span>
  );
}
