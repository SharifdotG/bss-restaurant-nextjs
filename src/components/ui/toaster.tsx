"use client";

import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { useShellLayout } from "@/lib/use-shell-layout";

/** Toasts on our tokens. Phones put them at the top, clear of the bottom tabs. */
function Toaster() {
  const { resolvedTheme } = useTheme();
  const phone = useShellLayout() === "phone";

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position={phone ? "top-center" : "bottom-right"}
      offset={24}
      mobileOffset={12}
      gap={10}
      icons={{
        success: <CheckCircleIcon weight="duotone" className="size-5 text-tone-green" />,
        error: <WarningCircleIcon weight="duotone" className="size-5 text-tone-red" />,
        info: <InfoIcon weight="duotone" className="size-5 text-muted-foreground" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg",
          icon: "mt-px shrink-0",
          content: "min-w-0 flex-1",
          title: "font-bold",
          description: "mt-0.5 text-muted-foreground text-pretty",
          actionButton:
            "ml-2 h-8 shrink-0 rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-muted",
        },
      }}
    />
  );
}

export { Toaster };
