import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base text-foreground transition-[border-color,box-shadow] duration-(--duration-fast) ease-standard outline-none placeholder:text-muted-foreground hover:border-tone-slate focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/15",
        className,
      )}
      {...props}
    />
  );
}

type IconInputProps = React.ComponentProps<"input"> & {
  icon: Icon;
  /** Something at the far end, like a show-password button. */
  end?: React.ReactNode;
};

/** An input with an icon at the start, and room for a control at the end. */
function IconInput({ icon: Icon, end, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <Icon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
      />
      <Input className={cn("pl-10", end && "pr-11", className)} {...props} />
      {end && <div className="absolute top-1/2 right-1.5 -translate-y-1/2">{end}</div>}
    </div>
  );
}

export { IconInput, Input };
