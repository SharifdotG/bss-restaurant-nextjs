"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

/** On/off for one setting. The knob stays white in both themes, as drawn. */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "hit-target relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-input p-[3px] transition-colors duration-(--duration-fast) ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/40 data-checked:bg-primary data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="size-[18px] rounded-full bg-white shadow-sm transition-transform duration-(--duration-base) ease-standard data-checked:translate-x-4" />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
