import type { Icon } from "@phosphor-icons/react";
import { TONES, type Tone } from "@/lib/tones";
import { cn } from "@/lib/utils";

type AlertProps = {
  tone: Exclude<Tone, "orange">;
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
      className={cn("flex gap-3 rounded-lg px-4 py-3.5 text-sm", TONES[tone], className)}
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
