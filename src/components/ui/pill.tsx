import type { Icon } from "@phosphor-icons/react";
import { TONES, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

type PillProps = {
  tone: Tone;
  icon?: Icon;
  children: React.ReactNode;
  className?: string;
};

/** A state label: tinted ground, duotone icon, a word. Colour is never the only signal. */
function Pill({ tone, icon: Icon, children, className }: PillProps) {
  return (
    <span
      data-slot="pill"
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {Icon && <Icon weight="duotone" className="size-3.5" />}
      {children}
    </span>
  );
}

export { Pill };
