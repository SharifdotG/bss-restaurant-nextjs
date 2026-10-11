"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "@/lib/utils";

type RadioCardsProps<T extends string> = {
  value: T | null;
  onValueChange: (value: T) => void;
  options: { value: T; title: React.ReactNode; hint?: React.ReactNode; disabled?: boolean }[];
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/** A stack of full-width choices with a line of detail each, for picks that need explaining. */
function RadioCards<T extends string>({
  value,
  onValueChange,
  options,
  className,
  ...props
}: RadioCardsProps<T>) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={cn("grid gap-2", className)}
      {...props}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 transition-[background-color,border-color,box-shadow,scale] duration-(--duration-fast) ease-standard hover:bg-muted active:scale-[0.98]",
            "has-focus-visible:ring-3 has-focus-visible:ring-ring/40 has-data-checked:border-primary has-data-checked:bg-primary-soft",
            option.disabled && "pointer-events-none opacity-50",
          )}
        >
          <Radio.Root
            value={option.value}
            disabled={option.disabled}
            className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-input bg-card outline-none data-checked:border-primary"
          >
            <Radio.Indicator className="size-2.5 rounded-full bg-primary data-unchecked:hidden" />
          </Radio.Root>
          <span className="min-w-0 flex-1">
            <span className="block text-sm">{option.title}</span>
            {option.hint && (
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            )}
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

export { RadioCards };
