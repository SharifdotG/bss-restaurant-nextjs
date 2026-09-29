import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const tones = {
  red: "bg-tone-red-subtle text-tone-red-text",
  amber: "bg-tone-amber-subtle text-tone-amber-text",
  green: "bg-tone-green-subtle text-tone-green-text",
  slate: "bg-tone-slate-subtle text-tone-slate-text",
} as const;

type AlertProps = {
  tone: keyof typeof tones;
  icon: Icon;
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/** A tinted callout: what happened in bold, then what to do about it. */
function Alert({ tone, icon: Icon, title, children, className }: AlertProps) {
  return (
    <div
      role={tone === "red" || tone === "amber" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-lg px-4 py-3.5 text-sm", tones[tone], className)}
    >
      <Icon weight="duotone" className="mt-px size-[18px] shrink-0" />
      <div className="min-w-0">
        <p className="font-bold">{title}</p>
        {children && <div className="mt-0.5 text-pretty">{children}</div>}
      </div>
    </div>
  );
}

export { Alert };
