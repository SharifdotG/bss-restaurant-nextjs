"use client";

import { ArrowLeftIcon, XIcon } from "@phosphor-icons/react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StepHeaderProps = {
  title: string;
  subtitle?: string;
  /** Shown as "2 of 3" when both are given. */
  step?: number;
  total?: number;
  /** A back arrow; without it the button closes the flow instead. */
  onBack?: (() => void) | null;
  onClose?: () => void;
  actions?: React.ReactNode;
};

/** The sticky header of a phone flow that goes screen by screen (POS, billing). */
export function StepHeader({
  title,
  subtitle,
  step,
  total,
  onBack,
  onClose,
  actions,
}: StepHeaderProps) {
  const t = useTranslations("common");
  const format = useFormatter();
  const leave = onBack ?? onClose;

  return (
    <header className="sticky top-0 z-20 -mx-4 -mt-5 mb-4 flex items-center gap-2 bg-background/95 px-2 py-3 backdrop-blur-sm md:-mx-6 md:-mt-2 md:px-4">
      {leave && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={onBack ? t("back") : t("close")}
          onClick={leave}
        >
          {onBack ? <ArrowLeftIcon className="size-5" /> : <XIcon className="size-5" />}
        </Button>
      )}
      <div className={cn("min-w-0 flex-1", !leave && "pl-2")}>
        <h1 className="truncate text-lg leading-tight font-bold">{title}</h1>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {step !== undefined && total !== undefined && (
        <span className="pr-2 text-sm font-bold text-muted-foreground tabular-nums">
          {t("stepOf", { step: format.number(step), total: format.number(total) })}
        </span>
      )}
      {actions}
    </header>
  );
}

/**
 * A bar pinned to the bottom of the screen for the step's main action. On pages that keep
 * the phone's bottom tabs it sits just above them.
 */
export function StepBar({
  children,
  aboveTabs,
}: {
  children: React.ReactNode;
  aboveTabs?: boolean;
}) {
  return (
    <div
      className={cn(
        "sticky z-20 -mx-4 mt-6 border-t border-border bg-background/95 px-4 pt-3 backdrop-blur-sm md:-mx-6 md:px-6",
        aboveTabs
          ? "bottom-[calc(76px+env(safe-area-inset-bottom))] pb-3 md:bottom-0 md:pb-4"
          : "bottom-0 pb-[max(env(safe-area-inset-bottom),16px)]",
      )}
    >
      {children}
    </div>
  );
}
